import express from "express";
import dotenv from "dotenv";
import { Worker } from "bullmq";
import Redis from "ioredis";
import path from "path";
import { fileURLToPath } from "url";
import { generateInvoice } from "./generateInvoice.js";
import { sendMail } from "./sendMail.js";
import fs from "fs";

// Set up __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5001;

// Redis Connection
const bullRedisConnection = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
});

// Worker Setup
const worker = new Worker(
    "invoiceQueue",
    async (job) => {
        const order = job.data.order;
        const user = job.data.user;

        console.log("Processing job:", job.id);

        const outputPath = path.join(
            __dirname,
            `invoices/invoice-${order._id}.pdf`
        );

        await generateInvoice(order, outputPath);

        await sendMail({
            to: user.email,
            subject: "Your Invoice from Agrimitra",
            content:
                `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">Agrimitra</h1>
                        <p style="margin: 0; font-size: 16px;">Your Trusted Partner in Agriculture</p>
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #333;">Hello ${user.name},</h2>
                        <p style="color: #555; font-size: 14px;">Thank you for your order! Please find your invoice attached below.</p>
                        <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                            <h3 style="margin: 0; color: #333;">Order Summary</h3>
                            <p style="margin: 5px 0; color: #555; font-size: 14px;">Order ID: <strong>${order._id}</strong></p>
                            <p style="margin: 5px 0; color: #555; font-size: 14px;">Order Date: <strong>${new Date(order.createdAt).toLocaleDateString()}</strong></p>
                            <p style="margin: 5px 0; color: #555; font-size: 14px;">Total Amount: <strong>₹${order.shippingPrice.toFixed(2)}</strong></p>
                        </div>
                        <p style="color: #555; font-size: 14px;">If you have any questions or need assistance, feel free to contact us at <a href="mailto:support@agrimitra.in" style="color: #4CAF50; text-decoration: none;">support@agrimitra.in</a>.</p>
                    </div>
                    <div style="background-color: #f1f1f1; padding: 10px; text-align: center; color: #777; font-size: 12px;">
                        <p style="margin: 0;">Thank you for choosing Agrimitra!</p>
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Agrimitra. All rights reserved.</p>
                    </div>
                </div>`
            ,
            isHtml: true,
            attachments: [
                {
                    filename: `agrimitra-invoice.pdf`,
                    path: outputPath,
                },
            ],
        });

        // Optional: clean up file after sending
        fs.unlink(outputPath, (err) => {
            if (err) console.error("Error deleting file:", err);
            else console.log("Invoice file deleted:", outputPath);
        });
    },
    {
        connection: bullRedisConnection,
    }
);

worker.on("completed", (job) => {
    console.log(`Job ${job.id} has been completed`);
});

worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
});

// Basic health check endpoint
app.get("/", (req, res) => {
    res.send("Invoice Worker is running.");
});

app.listen(PORT, () => {
    console.log(`Invoice Worker server listening on port ${PORT}`);
});
