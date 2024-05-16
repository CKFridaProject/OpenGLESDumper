#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys

import os
import numpy as np
from PIL import Image
import struct
import matplotlib.pyplot as plt

def showImg(fn):
    # Open the binary file
    with open(fn, 'rb') as f:
        # Read the width, height, and format
        width = struct.unpack('i', f.read(4))[0]
        height = struct.unpack('i', f.read(4))[0]
        format = struct.unpack('i', f.read(4))[0]
    
        # Check the format
        if format == 0x1908:  # GL_RGBA
            mode = 'RGBA'
        else:
            print('Unsupported format')
            return
    
        # Read the pixel data
        pixels = np.fromfile(f, dtype=np.uint8, count=width*height*4)
        pixels = pixels.reshape((height, width, 4))
    
        # Create a PIL Image and display it
        img = Image.fromarray(pixels, mode)
        return img

def main():
    dir  = '/tmp/dumps'
    for root, dirs, files in os.walk(dir):
        for f in files:
            fn = os.path.join(root, f)
            showImg(fn)

def main():
    if len(sys.argv) != 2:
        print('Usage: %s <filename>' % sys.argv[0])
        sys.exit(1)
    fn = sys.argv[1]
    im = showImg(fn)
    plt.imshow(im)
    plt.show()
    
if __name__ == '__main__':
    main()
