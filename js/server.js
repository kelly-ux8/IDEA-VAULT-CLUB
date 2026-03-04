const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const cors = require("cors");
const Work = require("./models/Work");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use("/certificates", express.static("certificates"));

mongoose.connect("mongodb://127.0.0.1:27017/ideavault", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { title, description, authorEmail, license, ipStatus, isPublic } = req.body;

    const existing = await Work.findOne({ title });
    if (existing) {
      return res.status(400).json({ message: "Fraud detected: Title already exists." });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const blockchainProof = crypto.createHash("sha256")
      .update(hash + Date.now())
      .digest("hex");

    const newWork = await Work.create({
      title,
      description,
      authorEmail,
      license,
      ipStatus,
      filePath: req.file.path,
      fileHash: hash,
      timestamp: new Date(),
      blockchainProof,
      isPublic: isPublic === "true"
    });

    generateCertificate(newWork);

    res.json({
      message: "Work recorded successfully",
      certificate: `/certificates/${newWork._id}.pdf`
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

function generateCertificate(work) {
  const doc = new PDFDocument();
  const path = `certificates/${work._id}.pdf`;

  doc.pipe(fs.createWriteStream(path));

  doc.fontSize(20).text("Intellectual Property Record Certificate", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Title: ${work.title}`);
  doc.text(`Author: ${work.authorEmail}`);
  doc.text(`License: ${work.license}`);
  doc.text(`IP Status: ${work.ipStatus}`);
  doc.text(`Timestamp: ${work.timestamp}`);
  doc.text(`File Hash (SHA256): ${work.fileHash}`);
  doc.text(`Blockchain Proof: ${work.blockchainProof}`);

  doc.end();
}

app.get("/marketplace", async (req, res) => {
  const works = await Work.find({ isPublic: true });
  res.json(works);
});

app.listen(5000, () => console.log("Server running on port 5000"));
