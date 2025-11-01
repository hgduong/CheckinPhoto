const express = require('express');
const app = express();
const connectDB = require('./config/db');
connectDB();
app.use(express.json());
const path = require('path');
// serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// mount gallery routes
const galleryRouter = require('./routes/gallery');
app.use('/api', galleryRouter);
app.get('/', async(req, res)=>{
    try {
        res.send({message: 'Welcome to Practical Exam!'});
    } catch (error) {
        res.send({error: error.message});
    }
});

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));