
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import config from '../webpack.config';


const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.static('./dist'));


const compiler = webpack(config, (error, stats) => {
    if (error) {
        console.error(error);
        return;
    }

    console.log(
        stats?.toString({
            chunks: false,  // Makes the build much quieter
            colors: true    // Shows colors in the console
        })
    );
});


// Configure webpack middleware
app.use(webpackDevMiddleware(compiler, {
    publicPath: config.output?.publicPath as string,
}));
app.use(webpackHotMiddleware(compiler));

let images: Array<{ id: number; data: Buffer; }> = [];

app.get('/ping', (req, res) => {
    res.send('Hello World!');
})

app.post('/upload', upload.single('image'), (req, res) => {
    if (req.file === undefined) {
        return res.status(400).end();
    }
    images.push({ id: images.length, data: req.file.buffer });
    io.emit('new image', images[images.length - 1]);
    res.status(200).end();
});

io.on('connection', (socket) => {
    socket.emit('images', images);
});

app.use(express.static(path.resolve(__dirname, 'dist')));

server.listen(3000, () => {
    console.log('Server and client are running on port 3000');
});

