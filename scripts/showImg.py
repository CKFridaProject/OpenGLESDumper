#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys



import numpy as np
from PIL import Image
import struct

def main():
    # Open the binary file
    with open('/tmp/00000179.bin', 'rb') as f:
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
        img.show()
    
if __name__ == '__main__':
    main()
