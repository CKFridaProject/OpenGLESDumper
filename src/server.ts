
import { Image, ImageData } from 'canvas';
import ndarray from 'ndarray';
import * as np from 'numjs';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import webpack from 'webpack';

import webpackDevMiddleware from 'webpack-dev-middleware';
import config from '../webpack.config';
import {
    DUMP_DATA,
    TEXTURES_TYPE,
}  from './utils';
import * as child_process from 'child_process';
import * as fs from 'fs';
import webpackHotMiddleware from 'webpack-hot-middleware';


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
            chunks: true,  // Makes the build much quieter
            colors: true    // Shows colors in the console
        })
    );
});


// Configure webpack middleware
app.use(webpackDevMiddleware(compiler, {
    publicPath: config.output?.publicPath as string,
}));
app.use(webpackHotMiddleware(compiler));

let images: Array<{ fn: string; data: DUMP_DATA; }> = [];

const execCmd = (cmd:string) => {
    console.log(`command: ${cmd}`);
    child_process.execSync(cmd, { stdio: 'inherit' });
}

const pullDumps = (packageName:string, dumpDir:string) => {
    execCmd( `rm -fr ${dumpDir} && mkdir ${dumpDir} && adb pull /data/data/${packageName}/files/dumps .`);
    //execCmd( `adb pull /data/data/${packageName}/files/Texture2D.json .`);
}

const updateImages = (dumpDir:string) => {
    images =[]
    const dumpFiles = fs.readdirSync(dumpDir);
    const jsonFiles = dumpFiles.filter(fn => fn.endsWith('.json'));
    for (const fn of jsonFiles) {
        const data = JSON.parse(fs.readFileSync(path.join(dumpDir, fn), 'utf-8')) as DUMP_DATA;
        images.push({ fn, data });
    }
}

const updateBins = (dumpDir:string) => {
    const bins : {
        width: number;
        height: number;
        format: number;
        pixels: Uint8Array,
    }[] =[]
    const dumpFiles = fs.readdirSync(dumpDir);
    const jsonFiles = dumpFiles.filter(fn => fn.endsWith('.bin'));
    for (const fn of jsonFiles) {
        const fullpath = path.join(dumpDir,fn)

        const binData = new Uint8Array(fs.readFileSync(fullpath));

        const GL_RGBA = 0x1908;

        let dataView = new DataView(binData.buffer);

        // Read width, height, and format
        let width  = dataView.getInt32(0, true);
        let height = dataView.getInt32(4, true);
        let format = dataView.getInt32(8, true);

        let mode: string;

        // Check the format
        if (format === GL_RGBA) {  // GL_RGBA
            mode = 'RGBA';
        } else {
            console.log('Unsupported format');
            continue
        }


        let pixels = binData.slice(12);

        bins.push({ 
            width,
            height,
            format,
            pixels,
        })
    }
    return bins
}



app.get('/ping', (req, res) => {
    res.send('Hello World!');
})

app.get('/pull', (req, res) => {
    const query = req.query as { [key: string]: string };
    const packageName = query.p ?? 'com.Joymax.GreatMagician';
    const dumpDir = `${process.cwd()}/dumps`;
    pullDumps(packageName, dumpDir);
    const files = fs.readdirSync(dumpDir);
    res.json({ count: files.length });
});

app.get('/refresh', (req, res) => {
    const dumpDir = `${process.cwd()}/dumps`;
    updateImages(dumpDir);
    res.json({ count:images.length, files : images.map(i => i.fn) });
});


app.post('/upload', upload.single('image'), (req, res) => {
    if (req.file === undefined) {
        return res.status(400).end();
    }
    // images.push({ id: images.length, data: req.file.buffer });
    // io.emit('new image', images[images.length - 1]);
    // res.status(200).end();
    res.status(500).end();
});

io.on('connection', (socket) => {
    socket.on('get_images', () => {
        const dumpDir = `${process.cwd()}/dumps`;
        updateImages(dumpDir);
        socket.emit('images', images);
    });

    socket.on('get_bins', () => {
        const dumpDir = `${process.cwd()}/dumps`;
        const bins = updateBins(dumpDir);
        console.log(`bins: ${bins.length}`)
        socket.emit('bins', bins);
    });


    socket.on('texture2D', () => {
        const fn = `${process.cwd()}/Texture2D.json`;
        const data = JSON.parse(fs.readFileSync(fn, 'utf-8')) as TEXTURES_TYPE;
        socket.emit('textures', data);
    });
});


app.use(express.static(path.resolve(__dirname, 'dist')));

server.listen(3000, () => {
    console.log('Server and client are running on port 3000');
});

