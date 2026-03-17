const nodemailer = require('nodemailer');
const path = require('path'); // 🔥 IMPORTANTE

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const enviarEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"BarberShop" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            attachments: [
                {
                    filename: 'logo.png',
                    path: path.join(__dirname, '../uploads/logo.png'), // ✅ ruta correcta
                    cid: 'logo@barbershop'
                }
            ]
        });

        console.log(`📧 Email enviado a ${to}: ${info.messageId}`);
    } catch (error) {
        console.error('❌ Error enviando email:', error.message);
        throw error;
    }
};

module.exports = enviarEmail;