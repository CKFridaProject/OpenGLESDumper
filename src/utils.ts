

export interface  glTexImage2D_DATA {
    target         : string;
    level          : number;
    internalFormat : string;
    width          : number;
    height         : number;
    format         : string;
    type           : string;
    data           : string;
}

export interface DUMP_DATA {
    function    : 'glTexImage2D';

    data        : glTexImage2D_DATA;
        
}
