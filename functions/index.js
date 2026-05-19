import express from "express";
import cors from "cors";
import { https } from "firebase-functions";
import practiceRouter from "./practice_registration.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use("/rihanyo", practiceRouter);

export const api = https.onRequest(app);