const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const path = require('path');
const fs = require('fs');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true para 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

const enviarEmail = async ({ to, subject, html }) => {
    const logoPath = path.join(__dirname, '../uploads/logo.png');
    const logoExists = fs.existsSync(logoPath);

    const enviarConNodemailer = async () => {
        console.log(`📧 [Email] Usando Nodemailer (Gmail) para enviar correo a ${to}`);
        const attachments = logoExists ? [{
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo@barbershop'
        }] : [];

        const info = await transporter.sendMail({
            from: `"BarberShop" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            attachments
        });

        console.log(`✅ Email enviado vía Nodemailer a ${to}: ${info.messageId}`);
        return info;
    };

    try {
        // 🚀 PROVEEDOR 1: RESEND (Tecnología moderna)
        if (resend) {
            console.log(`🚀 [Email] Intentando enviar vía Resend API a ${to}`);
            
            const attachments = logoExists ? [{
                filename: 'logo.png',
                content: fs.readFileSync(logoPath)
            }] : [];

            const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
            
            const { data, error } = await resend.emails.send({
                from: `"BarberShop" <${fromEmail}>`,
                to,
                subject,
                html,
                attachments
            });

            if (error) {
                console.warn('⚠️ Error enviando con Resend, haciendo fallback a Nodemailer:', error.message);
                return await enviarConNodemailer(); // Fallback inteligente
            }

            console.log(`✅ Email enviado exitosamente vía Resend: ${data.id}`);
            return data;
        } 
        
        // Si no hay Resend API Key, usamos Nodemailer directamente
        return await enviarConNodemailer();

    } catch (error) {
        console.error('❌ Error general enviando email:', error.message);
        // Último intento con Nodemailer si hay error catastrófico
        try {
            return await enviarConNodemailer();
        } catch (fallbackError) {
            console.error('❌ Fallback también falló:', fallbackError.message);
            throw fallbackError;
        }
    }
};

module.exports = enviarEmail;