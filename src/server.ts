
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import config from '../webpack.config';
import {
    DUMP_DATA,
}  from './utils';
import * as child_process from 'child_process';
import * as fs from 'fs';


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
    execCmd( `adb pull /data/data/${packageName}/files/Texture2D.json .`);
}

const updataImages = (dumpDir:string) => {
    images =[]
    const dumpFiles = fs.readdirSync(dumpDir);
    const jsonFiles = dumpFiles.filter(fn => fn.endsWith('.json'));
    for (const fn of jsonFiles) {
        const data = JSON.parse(fs.readFileSync(path.join(dumpDir, fn), 'utf-8')) as DUMP_DATA;
        images.push({ fn, data });
    }
}


app.get('/ping', (req, res) => {
    res.send('Hello World!');
})

app.get('/pull', (req, res) => {
    const query = req.query as { [key: string]: string };
    const packageName = query.p ?? 'com.Joymax.GreatMagician';
    const dumpDir = `${process.cwd()}/dumps`;
    pullDumps(packageName, dumpDir);
    const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.json'));
    res.json({ count: files.length });
});

app.get('/refresh', (req, res) => {
    const dumpDir = `${process.cwd()}/dumps`;
    updataImages(dumpDir);
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
    const dumpDir = `${process.cwd()}/dumps`;
    updataImages(dumpDir);
    socket.emit('images', images);
});

app.use(express.static(path.resolve(__dirname, 'dist')));

server.listen(3000, () => {
    console.log('Server and client are running on port 3000');
});

