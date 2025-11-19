const express = require("express");
const multer = require("multer");
const { fetch, Headers, Request, Response } = require("undici");
globalThis.fetch = fetch;
globalThis.Headers = Headers;
globalThis.Request = Request;
globalThis.Response = Response;

const { NFTStorage, File } = require("nft.storage");
const fs = require("fs");
require("dotenv").config();

const app = express();

// ==== CORS ====
const cors = require("cors");
app.use(cors({
  origin: "https://taleshack-prog.github.io",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// ==== CONFIG ====
const port = process.env.PORT || 3000;
const upload = multer({ dest: "uploads/" });
const nftStorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== ROOT ENDPOINT ====
app.get("/", (req, res) => {
  res.send("🧠 NeuroArte DAO API ativa e pronta pra subir arte pro IPFS 🎨🚀");
});

// ==== UPLOAD ENDPOINT ====
app.post("/upload", upload.single("artwork"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("Nenhum arquivo enviado.");
    }

    console.log("📄 Upload recebido:", req.file);

    const filePath = req.file.path;
    const fileBuffer = await fs.promises.readFile(filePath);

    // Convertendo para File (Web API)
    const imageFile = new File([fileBuffer], req.file.originalname, {
      type: req.file.mimetype
    });

    // ==== AQUI ESTÁ O MÉTODO CORRETO PARA BACKEND ====
    const metadata = await nftStorage.store({
      name: req.body.title || "Obra Sem Título",
      description: req.body.description || "Descrição ausente",
      image: imageFile
    });

    console.log("🟢 Upload concluído:", metadata);

    // Apagar arquivo temporário
    fs.unlinkSync(filePath);

    const publicUrl = `https://ipfs.io/ipfs/${metadata.ipnft}`;

    return res.status(200).json({
      cid: metadata.ipnft,
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

// ==== START SERVER ====
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});
