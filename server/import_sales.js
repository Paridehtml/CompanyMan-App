const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

const uri = 'mongodb+srv://acconciamessaparide:porcodio1885@cluster0.5nlc1.mongodb.net/companyman?retryWrites=true&w=majority';

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const saleSchema = new mongoose.Schema({
  transaction_id: Number,
  date: Date,
  amount: Number,
  payment_method: String,
  product: String,
});

const Sale = mongoose.model('Sale', saleSchema);

let rows = [];

fs.createReadStream('sales.csv')
  .pipe(csv())
  .on('data', (row) => {
    // Validate and parse fields
    const parsedDate = new Date(row.date);
    const parsedAmount = Number(row.amount);
    const parsedId = Number(row.transaction_id);

    if (isNaN(parsedDate.valueOf()) || isNaN(parsedAmount) || isNaN(parsedId)) {
      console.error('Skipping row, invalid value:', row);
      return;
    }
    row.date = parsedDate;
    row.amount = parsedAmount;
    row.transaction_id = parsedId;

    rows.push(row);
  })
  .on('end', async () => {
    try {
      await Sale.insertMany(rows);
      console.log('CSV import finished!');
    } catch (e) {
      console.error('Error during batch insert:', e);
    }
    mongoose.disconnect();
  });
