const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();
const { generateChallenge, verifySignatureAndCreateJWT, authMiddleware } = require('./auth');
const app = express();

// ==== CORS ====
const cors = require("cors");
app.use(cors({
  origin: "https://taleshack-prog.github.io",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
// ============ ARMAZENAMENTO EM MEMÓRIA ============
const artProposals = [];
const researchProposals = [];
const votes = {};

// ============ AUTENTICAÇÃO ============

/**
 * POST /api/auth/challenge
 * Gera um desafio que o usuário precisa assinar
 */
app.post("/api/art/submit", authMiddleware, (req, res) => {
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
      wallet
    });
  } else {
    res.status(401).json({
      success: false,
      error: result.error
    });
  }
});
// ==== CONFIG ====
const port = process.env.PORT || 10000;
const upload = multer({ dest: "uploads/" });

// ==== ARMAZENAMENTO EM MEMÓRIA (depois migra para banco) ====
const artProposals = [];
const researchProposals = [];
const votes = {};

// ==== ROOT ENDPOINT ====
app.get("/", (req, res) => {
  res.send("🧠 NeuroArte DAO API ativa usando Pinata IPFS 🎨🚀");
});

// ============ ARTE ============

// Upload de arte (já existia)
app.post("/upload", upload.single("artwork"), async (req, res) => {
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

// Submeter obra de arte
app.post("/api/art/submit", (req, res) => {
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
      votes: { for: 0, against: 0 }
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

// Listar propostas de arte
app.get("/api/art/proposals", (req, res) => {
  const pending = artProposals.filter(p => p.status === "pending_curation");
  res.json({ proposals: pending, total: pending.length });
});

// ============ PESQUISA ============

// Submeter proposta de pesquisa
app.post("/api/research/submit", (req, res) => {
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
      votes: { for: 0, against: 0 }
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

// Listar propostas de pesquisa
app.get("/api/research/proposals", (req, res) => {
  const pending = researchProposals.filter(p => p.status === "pending_review");
  res.json({ proposals: pending, total: pending.length });
});

// ============ VOTAÇÃO ============

// Registrar voto
app.post("/api/voting/vote", (req, res) => {
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

// Ver resultados da votação
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

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "NeuroArt DAO Backend is running ✅" });
});

// ==== START SERVER ====
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});
