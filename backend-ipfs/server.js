const express = require("express");
const multer = require("multer");
const { fetch, Headers, Request, Response } = require('undici');
globalThis.fetch = fetch;
globalThis.Headers = Headers;
globalThis.Request = Request;
globalThis.Response = Response;
 

const { NFTStorage, File } = require("nft.storage");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const cors = require("cors");
const corsOptions = {
  origin: "https://taleshack-prog.github.io",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));


const port = process.env.PORT || 3000;

const upload = multer({ dest: "uploads/" });

const nftStorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("🧠 NeuroArte DAO API ativa e pronta pra subir arte pro IPFS 🎨🚀");
});

app.post("/upload", upload.single("artwork"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("Nenhum arquivo enviado.");
    }

    console.log("📩 Dados recebidos no upload:");
    console.log("Title:", req.body.title);
    console.log("Description:", req.body.description);
    console.log("Arquivo:", req.file);

    const filePath = req.file.path;
    const fileData = await fs.promises.readFile(filePath);
    const fileName = req.file.originalname;

    const metadata = await nftStorage.store({
  
 
      name: req.body.title || "Obra Sem Título",
      description: req.body.description || "Enviada via portal NeuroArte DAO",
      image: new File([fileData], fileName, { type: req.file.mimetype }),
    });

    fs.unlinkSync(filePath); // limpa temporário

    // Corrigir o link da imagem IPFS
    const imageUrl = metadata.data.image; // já vem como "ipfs://..."
const ipfsUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");

const imageUrl = metadata.data.image; // "ipfs://..." string
const ipfsUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");

return res.status(200).json({
  cid: metadata.ipnft,
  url: ipfsUrl,
  message: "Upload feito com sucesso!",
});

   


  } catch (err) {
    console.error("Erro no upload:", err);
    return res.status(500).json({ error: "Erro no upload", message: err.message });

  }
});

// ✅ Corrigido para produção Render
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Servidor ativo na porta ${port}`);
});
