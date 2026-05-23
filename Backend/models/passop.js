const mongoose = require("mongoose");

const passopSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    site: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Passop = mongoose.model("Passop", passopSchema);

module.exports = Passop;
