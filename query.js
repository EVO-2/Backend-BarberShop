const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EVO:Evo16948788@cluster0.ceahba7.mongodb.net/BACKEND-BARBERSHOP')
  .then(async () => {
    const Cita = mongoose.model('Cita', new mongoose.Schema({estado: String, fecha: Date}), 'citas');
    const r = await Cita.aggregate([{ $group: { _id: '$estado', count: { $sum: 1 } } }]);
    console.log('Citas by estado:', r);
    
    const minDate = await Cita.findOne().sort({fecha: 1}).select('fecha');
    const maxDate = await Cita.findOne().sort({fecha: -1}).select('fecha');
    console.log('Fechas citas min/max:', minDate?.fecha, maxDate?.fecha);

    process.exit(0);
  });
