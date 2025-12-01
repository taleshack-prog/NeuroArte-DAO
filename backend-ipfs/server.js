// backend/server.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();
const { generateChallenge, verifySignatureAndCreateJWT, authMiddleware, curatorMiddleware, isCurator, addCurator, removeCurator, curatorWhitelist } = require('./auth');

const app = express();

// ==== CORS ====
const cors = require("cors");
app.use(cors({
  origin: "https://taleshack-prog.github.io",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// ============ ARMAZENAMENTO EM MEMÓRIA ============
const artProposals = [];
const researchProposals = [];
const votes = {}; // Votação pública (compatibilidade)
const curatorVotes = {}; // ← NOVO: Votação de curadoria com prevenção de re-voto

// ==== CONFIG ====
const port = process.env.PORT || 10000;
const upload = multer({ dest: "uploads/" });

// ==== ROOT ENDPOINT ====
app.get("/", (req, res) => {
  res.send("🧠 NeuroArte DAO API ativa usando Pinata IPFS 🎨🚀");
});

// ============ AUTENTICAÇÃO ============

/**
 * POST /api/auth/challenge
 * Gera um desafio que o usuário precisa assinar
 */
app.post('/api/auth/challenge', (req, res) => {
  const { wallet } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet não fornecida' });
  }

  const { message, timestamp } = generateChallenge(wallet);

  res.json({
    message,
    timestamp
  });
});

/**
 * POST /api/auth/verify
 * Verifica a assinatura e cria um JWT
 */
app.post('/api/auth/verify', (req, res) => {
  const { wallet, message, signature } = req.body;

  if (!wallet || !message || !signature) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const result = verifySignatureAndCreateJWT(wallet, message, signature);

  if (result.success) {
    res.json({
      success: true,
      token: result.token,
      wallet,
      isCurator: isCurator(wallet)
    });
  } else {
    res.status(401).json({
      success: false,
      error: result.error
    });
  }
});

// ============ UPLOAD PINATA ============

app.post("/upload", authMiddleware, upload.single("artwork"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    console.log("📄 Upload recebido:", req.file);

    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);

    const formData = new FormData();
    formData.append("file", fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    formData.append("pinataMetadata", JSON.stringify({
      name: req.body.title || "Obra Sem Título",
      keyvalues: {
        description: req.body.description || "Sem descrição"
      }
    }));

    console.log("🔐 Usando JWT Pinata:", process.env.PINATA_JWT ? "OK" : "FALTANDO!");

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.PINATA_JWT}`
        }
      }
    );

    const cid = response.data.IpfsHash;
    const publicUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

    fs.unlinkSync(filePath);

    console.log("🟢 Upload concluído:", cid);

    return res.json({
      cid,
      url: publicUrl,
      message: "Upload feito com sucesso!"
    });

  } catch (err) {
    console.error("❌ Erro no upload:", err);
    return res.status(500).json({
      error: "Erro no upload",
      message: err.message
    });
  }
});

// ============ ARTE ============

/**
 * POST /api/art/submit
 * Submeter obra de arte (PROTEGIDO)
 */
app.post("/api/art/submit", authMiddleware, (req, res) => {
  try {
    const { title, description, ipfsHash, artistWallet, editions } = req.body;

    if (!title || !description || !ipfsHash || !artistWallet) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const proposal = {
      id: artProposals.length + 1,
      type: "art",
      title,
      description,
      ipfsHash,
      artistWallet,
      editions,
      status: "pending_curation",
      submittedAt: new Date(),
      votes: { for: 0, against: 0 },
      curatorVotes: { approve: 0, reject: 0 }
    };

    artProposals.push(proposal);

    console.log(`✅ Arte submetida: ${title} (ID: ${proposal.id})`);

    res.json({
      success: true,
      proposalId: proposal.id,
      status: "pending_curation",
      message: "Arte enviada para curadoria da DAO"
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao submeter arte" });
  }
});

/**
 * GET /api/art/proposals
 * Listar propostas de arte pendentes de curadoria
 */
app.get("/api/art/proposals", (req, res) => {
  const pending = artProposals.filter(p => p.status === "pending_curation" || p.status === "approved_by_curators");
  res.json({ proposals: pending, total: pending.length });
});

// ============ PESQUISA ============

/**
 * POST /api/research/submit
 * Submeter proposta de pesquisa (PROTEGIDO)
 */
app.post("/api/research/submit", authMiddleware, (req, res) => {
  try {
    const { title, abstract, picoJson, requestedFunding, scientistWallet } = req.body;

    if (!title || !abstract || !scientistWallet) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const proposal = {
      id: researchProposals.length + 1,
      type: "research",
      title,
      abstract,
      picoJson: picoJson || {},
      requestedFunding,
      scientistWallet,
      status: "pending_review",
      submittedAt: new Date(),
      votes: { for: 0, against: 0 },
      curatorVotes: { approve: 0, reject: 0 }
    };

    researchProposals.push(proposal);

    console.log(`✅ Pesquisa submetida: ${title} (ID: ${proposal.id})`);

    res.json({
      success: true,
      proposalId: proposal.id,
      status: "pending_review",
      message: "Proposta de pesquisa enviada para avaliação"
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao submeter pesquisa" });
  }
});

/**
 * GET /api/research/proposals
 * Listar propostas de pesquisa pendentes
 */
app.get("/api/research/proposals", (req, res) => {
  const pending = researchProposals.filter(p => p.status === "pending_review" || p.status === "approved_by_curators");
  res.json({ proposals: pending, total: pending.length });
});

// ============ VOTAÇÃO (COMPATIBILIDADE - MANTER) ============

/**
 * POST /api/voting/vote
 * Registrar voto (PROTEGIDO) - COMPATIBILIDADE COM CÓDIGO ANTIGO
 */
app.post("/api/voting/vote", authMiddleware, (req, res) => {
  try {
    const { proposalId, proposalType, voterWallet, vote } = req.body;

    if (!proposalId || !proposalType || !voterWallet || !vote) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    if (!["for", "against"].includes(vote)) {
      return res.status(400).json({ error: 'Vote deve ser "for" ou "against"' });
    }

    const voteKey = `${proposalType}_${proposalId}_${voterWallet}`;

    if (votes[voteKey]) {
      return res.status(400).json({ error: "Você já votou nesta proposta" });
    }

    votes[voteKey] = { vote, timestamp: new Date() };

    const proposals = proposalType === "art" ? artProposals : researchProposals;
    const proposal = proposals.find(p => p.id === proposalId);

    if (proposal) {
      if (vote === "for") {
        proposal.votes.for++;
      } else {
        proposal.votes.against++;
      }
    }

    console.log(`✅ Voto registrado: ${proposalType} #${proposalId} - ${vote}`);

    res.json({
      success: true,
      message: "Voto registrado com sucesso",
      votes: proposal.votes
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao votar" });
  }
});

/**
 * GET /api/voting/results/:proposalType/:proposalId
 * Ver resultados da votação
 */
app.get("/api/voting/results/:proposalType/:proposalId", (req, res) => {
  const { proposalType, proposalId } = req.params;
  const proposals = proposalType === "art" ? artProposals : researchProposals;
  const proposal = proposals.find(p => p.id === parseInt(proposalId));

  if (!proposal) {
    return res.status(404).json({ error: "Proposta não encontrada" });
  }

  res.json({
    proposalId: proposal.id,
    title: proposal.title,
    votes: proposal.votes,
    total: proposal.votes.for + proposal.votes.against,
    approved: proposal.votes.for > proposal.votes.against
  });
});

// ============ CURADORIA (NOVO - WHITELIST COM PREVENÇÃO DE RE-VOTO) ============

/**
 * POST /api/voting/curate
 * Apenas curadores podem votar em obras para curadoria
 * Cada curador vota UMA VEZ por proposta
 * Requer whitelist e previne re-voto
 */
app.post("/api/voting/curate", curatorMiddleware, (req, res) => {
  try {
    const { proposalId, proposalType, vote } = req.body;
    const curatorWallet = req.user.wallet;

    // ============ VALIDAÇÃO 1: Campos obrigatórios ============
    if (!proposalId || !proposalType || !vote) {
      return res.status(400).json({ error: "Campos obrigatórios faltando: proposalId, proposalType, vote" });
    }

    // ============ VALIDAÇÃO 2: Voto válido ============
    if (!["approve", "reject"].includes(vote)) {
      return res.status(400).json({ error: 'Vote deve ser "approve" ou "reject"' });
    }

    // ============ VALIDAÇÃO 3: Tipo de proposta válido ============
    if (!["art", "research"].includes(proposalType)) {
      return res.status(400).json({ error: 'proposalType deve ser "art" ou "research"' });
    }

    // ============ VALIDAÇÃO 4: Curador está na whitelist ============
    if (!isCurator(curatorWallet)) {
      return res.status(403).json({ 
        error: "❌ Você não é um curador autorizado",
        wallet: curatorWallet
      });
    }

    // ============ VALIDAÇÃO 5: Proposta existe ============
    const proposals = proposalType === "art" ? artProposals : researchProposals;
    const proposal = proposals.find(p => p.id === parseInt(proposalId));

    if (!proposal) {
      return res.status(404).json({ error: `Proposta ${proposalType} #${proposalId} não encontrada` });
    }

    // ============ VALIDAÇÃO 6: Proposta ainda está em votação ============
    if (proposal.status !== "pending_curation" && proposal.status !== "pending_review") {
      return res.status(400).json({ 
        error: `❌ Proposta já foi decidida. Status atual: ${proposal.status}`,
        proposalId: proposal.id,
        currentStatus: proposal.status
      });
    }

    // ============ VALIDAÇÃO 7: PREVENÇÃO DE RE-VOTO - Curador ainda não votou ============
    const voteKey = `curator_${proposalType}_${proposalId}_${curatorWallet}`;
    
    if (curatorVotes[voteKey]) {
      return res.status(400).json({ 
        error: `❌ Você já votou nesta proposta`,
        yourVote: curatorVotes[voteKey].vote,
        votedAt: curatorVotes[voteKey].timestamp,
        proposalId: proposal.id
      });
    }

    // ============ REGISTRAR VOTO ============
    curatorVotes[voteKey] = { 
      vote, 
      timestamp: new Date(),
      curator: curatorWallet
    };

    // ============ CONTAR VOTOS ============
    if (!proposal.curatorVotes) {
      proposal.curatorVotes = { approve: 0, reject: 0 };
    }

    if (vote === "approve") {
      proposal.curatorVotes.approve++;
    } else {
      proposal.curatorVotes.reject++;
    }

    const totalVotes = proposal.curatorVotes.approve + proposal.curatorVotes.reject;
    const totalCurators = curatorWhitelist.size;
    const approvalsNeeded = Math.ceil(totalCurators * 0.5) + 1; // 50%+1 quorum

    console.log(`✅ Voto registrado: ${proposalType} #${proposalId} - ${vote} por ${curatorWallet}`);
    console.log(`📊 Votos: Aprovar=${proposal.curatorVotes.approve}, Rejeitar=${proposal.curatorVotes.reject}`);
    console.log(`📈 Quorum: ${totalVotes}/${totalCurators} curadores votaram, ${approvalsNeeded} necessários para decidir`);

    // ============ VERIFICAR SE PROPOSTA FOI DECIDIDA ============
    let finalStatus = null;
    let wasFinalized = false;

    if (proposal.curatorVotes.approve >= approvalsNeeded) {
      finalStatus = "approved_by_curators";
      proposal.status = finalStatus;
      wasFinalized = true;
      console.log(`🎉 Proposta #${proposalId} APROVADA por curadoria!`);
    } else if (proposal.curatorVotes.reject >= approvalsNeeded) {
      finalStatus = "rejected_by_curators";
      proposal.status = finalStatus;
      wasFinalized = true;
      console.log(`❌ Proposta #${proposalId} REJEITADA por curadoria!`);
    }

    res.json({
      success: true,
      message: wasFinalized 
        ? `Proposta finalizada com status: ${finalStatus}`
        : `Voto registrado com sucesso`,
      curator: curatorWallet,
      yourVote: vote,
      votedAt: new Date(),
      currentVotes: {
        approve: proposal.curatorVotes.approve,
        reject: proposal.curatorVotes.reject
      },
      votingProgress: {
        totalVotesCast: totalVotes,
        totalCurators: totalCurators,
        quorumNeeded: approvalsNeeded,
        percentageVoted: Math.round((totalVotes / totalCurators) * 100)
      },
      proposal: {
        id: proposal.id,
        type: proposal.type,
        title: proposal.title,
        status: proposal.status
      },
      finalized: wasFinalized,
      finalStatus: finalStatus
    });

  } catch (error) {
    console.error('❌ Erro ao votar:', error);
    res.status(500).json({ error: "Erro ao registrar voto de curadoria", details: error.message });
  }
});

/**
 * GET /api/voting/curate/:proposalType/:proposalId
 * Ver resultados de curadoria de uma proposta
 */
app.get("/api/voting/curate/:proposalType/:proposalId", (req, res) => {
  try {
    const { proposalType, proposalId } = req.params;

    if (!["art", "research"].includes(proposalType)) {
      return res.status(400).json({ error: 'proposalType deve ser "art" ou "research"' });
    }

    const proposals = proposalType === "art" ? artProposals : researchProposals;
    const proposal = proposals.find(p => p.id === parseInt(proposalId));

    if (!proposal) {
      return res.status(404).json({ error: `Proposta ${proposalType} #${proposalId} não encontrada` });
    }

    const totalCurators = curatorWhitelist.size;
    const approvalsNeeded = Math.ceil(totalCurators * 0.5) + 1;
    const curatorVotesForProposal = proposal.curatorVotes || { approve: 0, reject: 0 };
    const totalVotes = curatorVotesForProposal.approve + curatorVotesForProposal.reject;

    res.json({
      success: true,
      proposal: {
        id: proposal.id,
        type: proposal.type,
        title: proposal.title,
        status: proposal.status,
        submittedAt: proposal.submittedAt
      },
      curation: {
        votes: {
          approve: curatorVotesForProposal.approve,
          reject: curatorVotesForProposal.reject
        },
        stats: {
          totalVotesCast: totalVotes,
          totalCurators: totalCurators,
          quorumNeeded: approvalsNeeded,
          percentageVoted: Math.round((totalVotes / totalCurators) * 100)
        },
        result: {
          approved: proposal.status === "approved_by_curators",
          rejected: proposal.status === "rejected_by_curators",
          pending: proposal.status === "pending_curation" || proposal.status === "pending_review",
          status: proposal.status
        }
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar resultados:', error);
    res.status(500).json({ error: "Erro ao buscar resultados de curadoria" });
  }
});

/**
 * GET /api/curate/pending
 * Listar todas as propostas pendentes de curadoria (view para curadores)
 */
app.get("/api/curate/pending", (req, res) => {
  try {
    const artPending = artProposals.filter(p => p.status === "pending_curation");
    const researchPending = researchProposals.filter(p => p.status === "pending_review");

    const pendingProposals = [
      ...artPending.map(p => ({
        id: p.id,
        type: "art",
        title: p.title,
        description: p.description,
        artistWallet: p.artistWallet,
        ipfsHash: p.ipfsHash,
        editions: p.editions,
        status: p.status,
        submittedAt: p.submittedAt,
        votes: p.curatorVotes || { approve: 0, reject: 0 }
      })),
      ...researchPending.map(p => ({
        id: p.id,
        type: "research",
        title: p.title,
        abstract: p.abstract,
        scientistWallet: p.scientistWallet,
        requestedFunding: p.requestedFunding,
        status: p.status,
        submittedAt: p.submittedAt,
        votes: p.curatorVotes || { approve: 0, reject: 0 }
      }))
    ];

    const totalCurators = curatorWhitelist.size;
    const quorumNeeded = Math.ceil(totalCurators * 0.5) + 1;

    res.json({
      success: true,
      pendingProposals,
      total: pendingProposals.length,
      curatorInfo: {
        totalCurators: totalCurators,
        quorumNeeded: quorumNeeded
      }
    });
  } catch (error) {
    console.error('❌ Erro ao listar propostas pendentes:', error);
    res.status(500).json({ error: "Erro ao listar propostas pendentes" });
  }
});

// ============ GERENCIAMENTO DE CURADORES (ADMIN) ============

/**
 * GET /api/curators/whoami
 * Verificar se wallet conectada é curador
 */
app.get("/api/curators/whoami", authMiddleware, (req, res) => {
  const wallet = req.user.wallet;
  
  res.json({
    success: true,
    wallet,
    isCurator: isCurator(wallet),
    message: isCurator(wallet) 
      ? "✅ Você é um curador autorizado" 
      : "❌ Você não é um curador",
    totalCurators: curatorWhitelist.size
  });
});

/**
 * POST /api/curators/add
 * Adicionar novo curador à whitelist (ADMIN ONLY - proteja com chave secreta)
 */
app.post("/api/curators/add", (req, res) => {
  try {
    const { wallet, adminKey } = req.body;
    const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secret-key-123';

    if (!adminKey || adminKey !== ADMIN_KEY) {
      return res.status(403).json({ error: "❌ Chave de admin inválida" });
    }

    if (!wallet) {
      return res.status(400).json({ error: "Wallet não fornecida" });
    }

    if (!wallet.startsWith('0x') || wallet.length !== 42) {
      return res.status(400).json({ error: "Wallet inválida. Deve ter formato: 0x..." });
    }

    if (isCurator(wallet)) {
      return res.status(400).json({ 
        error: "Curador já existe na whitelist",
        wallet: wallet,
        totalCurators: curatorWhitelist.size
      });
    }

    addCurator(wallet);

    res.json({
      success: true,
      message: `✅ Curador adicionado: ${wallet}`,
      wallet: wallet,
      totalCurators: curatorWhitelist.size
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao adicionar curador" });
  }
});

/**
 * POST /api/curators/remove
 * Remover curador da whitelist (ADMIN ONLY)
 */
app.post("/api/curators/remove", (req, res) => {
  try {
    const { wallet, adminKey } = req.body;
    const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secret-key-123';

    if (!adminKey || adminKey !== ADMIN_KEY) {
      return res.status(403).json({ error: "❌ Chave de admin inválida" });
    }

    if (!wallet) {
      return res.status(400).json({ error: "Wallet não fornecida" });
    }

    if (!isCurator(wallet)) {
      return res.status(404).json({ 
        error: "Curador não encontrado na whitelist",
        wallet: wallet
      });
    }

    removeCurator(wallet);

    res.json({
      success: true,
      message: `🗑️ Curador removido: ${wallet}`,
      wallet: wallet,
      totalCurators: curatorWhitelist.size
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover curador" });
  }
});

/**
 * GET /api/curators/list
 * Listar todos os curadores (ADMIN ONLY)
 */
app.get("/api/curators/list", (req, res) => {
  try {
    const adminKey = req.query.adminKey;
    const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secret-key-123';

    if (!adminKey || adminKey !== ADMIN_KEY) {
      return res.status(403).json({ error: "❌ Chave de admin inválida" });
    }

    res.json({
      success: true,
      curators: Array.from(curatorWhitelist),
      totalCurators: curatorWhitelist.size
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar curadores" });
  }
});

// ============ HEALTH CHECK ============

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "NeuroArte DAO Backend is running ✅",
    curators: curatorWhitelist.size,
    apiVersion: "1.1.0"
  });
});

// ==== START SERVER ====
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`👥 Curadores autorizados: ${curatorWhitelist.size}`);
  console.log(`🔐 Endpoints protegidos: /api/art/submit, /api/research/submit, /api/voting/curate`);
});
