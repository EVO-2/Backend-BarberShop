const crypto = require('crypto');

const referencia = 'SUB-69fab6fb2445f053796b0145-basico-1779772812663';
const monto_en_centavos = 4500000;
const moneda = 'COP';
const secret = 'test_integrity_I9h9P6Gg1jnoJufkZu7JX5TExWJXlUmu';

const cadena = `${referencia}${monto_en_centavos}${moneda}${secret}`;
const hash = crypto.createHash('sha256').update(cadena).digest('hex');

console.log('Cadena concatenada:', cadena);
console.log('Hash calculado:', hash);
console.log('¿Coincide con el del navegador?', hash === 'ea537815f39be4b105fa8276f5458e2ad2774f6ffb359768c25b6c28bc0c0c88');
