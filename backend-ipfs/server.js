const express = require("express");
const multer = require("multer");
const { fetch, Headers, Request, Response } = require('undici');
globalThis.fetch = fetch;
globalThis.Headers = Headers;
globalThis.Request = Request;
globalThis.Response = Response;

const { NFTStorage, File } = require("nft.storage");
const fs = require("fs");
require("dotenv").config();

const app = express();

// CORS para permitir chamadas do frontend
const cors = require("cors");
const corsOptions = {
  origin: "https://taleshack-prog.github.io",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};
app.use(cors(corsOptions));

// Configuração
const port = process.env.PORT || 3000;
const upload = multer({ dest: "uploads/" });
const nftStorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint raiz
app.get("/", (req, res) => {
  res.send("🧠 NeuroArte DAO API ativa e pronta pra subir arte pro IPFS 🎨🚀");
});

// Endpoint de upload
app.post("/upload", upload.single("artwork"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("Nenhum arquivo enviado.");

    console.log("📩 Upload recebido:");
    console.log("Título:", req.body.title);
    console.log("Descrição:", req.body.description);
    console.log("Arquivo:", req.file);

    // Lê arquivo temporário
    const filePath = req.file.path;
    const fileData = await fs.promises.readFile(filePath);
    const fileName = req.file.originalname;

    // 1️⃣ Upload da imagem pro IPFS
    const imageFile = new File([fileData], fileName, {
      type: req.file.mimetype,
    });
    const imageCid = await nftStorage.storeBlob(imageFile);

    // 2️⃣ Gera metadata.json
    const metadataContent = {
      name: req.body.title || "Obra Sem Título",
      description: req.body.description || "Enviada via portal NeuroArte DAO",
      image: `ipfs://${imageCid}`,
    };

    const metadataFile = new File(
      [JSON.stringify(metadataContent)],
      "metadata.json",
      { type: "application/json" }
    );

    // 3️⃣ Upload do metadata.json
    const metadataCid = await nftStorage.storeBlob(metadataFile);

    // 4️⃣ Limpa arquivo temporário
    fs.unlinkSync(filePath);

    // 5️⃣ Retorna link público
    const publicUrl = `https://ipfs.io/ipfs/${metadataCid}`;

    return res.status(200).json({
      cid: metadataCid,
      url: publicUrl,
      message: "Upload feito com sucesso!",
    });

  } catch (err) {
    console.error("❌ Erro no upload:", err);
    return res.status(500).json({
      error: "Erro no upload",
      message: err.message,
    });
  }
});

// Inicia servidor (Render exige 0.0.0.0)
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
});
