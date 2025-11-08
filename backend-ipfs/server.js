const express = require("express");
const multer = require("multer");
const { NFTStorage, File } = require("nft.storage");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: "uploads/" });

const nftStorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });
app.get("/", (req, res) => {
  res.send("Servidor da NeuroArte DAO está no ar 🧠🎨🚀");
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/upload", upload.single("artwork"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileData = await fs.promises.readFile(filePath);
    const fileName = req.file.originalname;

    const metadata = await nftStorage.store({
      name: req.body.title,
      description: req.body.description,
      image: new File([fileData], fileName, { type: req.file.mimetype }),
    });

    fs.unlinkSync(filePath); // remove o temporário

    res.status(200).json({ cid: metadata.ipnft, url: metadata.url });
  } catch (err) {
    res.status(500).send("Erro no upload: " + err.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor ativo em: http://localhost:${port}`);
});
