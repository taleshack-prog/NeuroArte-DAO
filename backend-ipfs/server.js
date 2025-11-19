const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const app = express();

// ==== CORS ====
const cors = require("cors");
app.use(cors({
  origin: "https://taleshack-prog.github.io", // frontend
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// ==== CONFIG ====
const port = process.env.PORT || 10000; // Render usa porta dinâmica
const upload = multer({ dest: "uploads/" });

// ==== ROOT ENDPOINT ====
app.get("/", (req, res) => {
  res.send("🧠 NeuroArte DAO API ativa usando Pinata IPFS 🎨🚀");
});

// ==== UPLOAD VIA PINATA ====
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

    // --- Metadados (opcional, mas útil)
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

    // Apaga arquivo temporário
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

// ==== START SERVER ====
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});
