const express = require("express");
const multer = require("multer");
const { NFTStorage, File } = require("nft.storage");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const cors = require("cors");
app.use(cors());

const port = process.env.PORT || 3000; // ✅ Mantém flexível pra ambiente

// Configura o upload local temporário
const upload = multer({ dest: "uploads/" });

// Inicializa o client do NFT.storage com a chave da env
const nftStorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

// Middleware para parsing de formulários e JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota de status
app.get("/", (req, res) => {
  res.send("🧠 NeuroArte DAO API ativa e pronta pra subir arte pro IPFS 🎨🚀");
});

// Rota de upload IPFS
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

    return res.status(200).json({
      cid: metadata.ipnft,
      url: `https://ipfs.io/ipfs/${metadata.data.image.href.split("/").pop()}`, // 💡 link IPFS direto pra imagem
      message: "Upload feito com sucesso!",
    });
  } catch (err) {
    console.error("Erro no upload:", err);
    return res.status(500).send("Erro no upload: " + err.message);
  }
});

// Inicializa o servidor na porta correta (Render-friendly!)
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Servidor ativo na porta ${port}`);
});
