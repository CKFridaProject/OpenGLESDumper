
'use strict';

import { 
    basename 
} from 'path'

import {
    HookActionOpt,
    HookAction,
} from './HookAction'


const dumpMemory = (p: NativePointer, l: number=0x20): void => {
    console.log(
        hexdump(p, {
            offset: 0,
            length: l,
            header: true,
            ansi: false,
        })
    );
};

const showBacktrace=(thiz:InvocationContext, sobase?:NativePointer, tstr?:string):void => {
    var callbacktrace = Thread.backtrace(thiz.context,Backtracer.ACCURATE);
    console.log(tstr!=undefined?tstr:"", ' callbacktrace ' + callbacktrace);
    callbacktrace.forEach(c=>{
        let sym =DebugSymbol.fromAddress(c);
        console.log(tstr!=undefined?tstr:"", c, "(", sobase!=undefined?c.sub(sobase):"",")",'=>', sym);
    })
}

type HookEnterFunType = (args:NativePointer[], tstr:string, thiz:InvocationContext )=>void;
type HookLeaveFunType = (retval:NativePointer, tstr:string, thiz:InvocationContext )=>NativePointer|void;

type HookFunActionOpt =  {
    enterFun        : HookEnterFunType,
    leaveFun        : HookLeaveFunType,
    showCallStack   : boolean,
    showParaMemory  : boolean,
    checkMemory     : boolean,
    nparas          : number, 
};

export type HookFunActionOptArgs =  Partial<HookActionOpt> & Partial<HookFunActionOpt>;

export class HookFunAction extends HookAction {

    enterFun        : HookEnterFunType = function(args, tstr, thiz) { };
    leaveFun        : HookLeaveFunType = function(retval, tstr, thiz) { };
    showCallStack   : boolean = false;
    showParaMemory  : boolean = false;
    checkMemory     : boolean = false;
    nparas          : number = 4;

    listener       ?: InvocationListener;
    running         : boolean = false;
    context        ?: InvocationContext;

    private static level : number = 0;
    private static funStack : string [] = [];

    static getLevelStr():string {
        const cnt = Math.max(this.level, 0);
        return '  '.repeat(cnt)
    }

    constructor(opts:  HookFunActionOptArgs = {}) {
        super(opts as Partial<HookActionOpt>)
        Object.assign(this, opts as Partial<HookFunActionOpt>);
    }

    hook(address:NativePointer):void{
        let {
            nparas, 
            hide, 
            showCallStack, 
            showParaMemory, 
            checkMemory, 
            maxhit, 
            enterFun,
            leaveFun,
            name
        } = this;
        let hitcount=0;
        const thiz = this;

        let showEnter = function(args:NativePointer[], tstr:string, thiz:InvocationContext) {
            let targs :  string []=[];
            for(let t =0;t<nparas ;t++){
                targs.push(args[t].toString());
            }
            console.log(tstr, 'enter', JSON.stringify(name), ' (', targs.join(','), ')')
        };
        let showLeave = function(retval:NativePointer, tstr:string, thiz:InvocationContext){
            console.log(HookFunAction.getLevelStr(), 'leave', JSON.stringify(name), retval);
        }
        //console.log('address', this.address)
        this.listener = Interceptor.attach(address, {
            onEnter: function (args: NativePointer[]) {
                if(thiz.beyondMaxHit()) return;
                HookFunAction.level++;
                thiz.running = true;
                //if (thiz.isInScopes()) 
                {
                    HookFunAction.funStack.push(name); 
                    for (let i = 0; i < nparas; i++) {
                        let key = `args${i}`;
                        this[key] = args[i];
                    }
                    this.showFun = showEnter;
                    if (!hide) {
                        showEnter(args, HookFunAction.getLevelStr(), this);
                        if (showParaMemory) {
                            for (var i = 0; i < nparas; i++) {
                                let key = `args${i}`;
                                let p = args[i]
                                if (checkMemory) {
                                    let range = Process.findRangeByAddress(p)
                                    if (range != null) {
                                        console.log(JSON.stringify(range))
                                        try{
                                            dumpMemory(p)
                                        }
                                        catch(e){
                                            console.error(`dump ${p} error`)
                                        }
                                    }
                                }
                                else {
                                    if (!p.isNull() && p.compare(0x100000) > 0) {
                                        dumpMemory(p);
                                    }
                                }
                            }
                        }
                        if (showCallStack) {
                            showBacktrace(this);
                        }
                    }
                    if (enterFun) enterFun(args, HookFunAction.getLevelStr(), this);
                    thiz.context = this;
                }
            },
            onLeave: function (retval) {
                delete thiz.context;
                //let isInScopes = thiz.isInScopes();
                thiz.running=false;
                if(thiz.beyondMaxHit()) return;
                //if (isInScopes) 
                {
                    if (!hide) { showLeave(retval, HookFunAction.getLevelStr(), this); }
                    this.showFun = showLeave;
                    if (leaveFun) {
                        let ret = leaveFun(retval, HookFunAction.getLevelStr(), this);
                        if (ret != undefined) { retval.replace(ret); }
                    }
                    HookFunAction.funStack.pop();
                }
                HookFunAction.level--;
                thiz.increaseHitCount()
            },
        });
    }

    unhook(): void {
        if(this.listener!=undefined){
            this.listener.detach()
        }
    }
};


export let hookDlopen =(soname:string, afterFun:()=>void, beforeFun?:()=>void|null, runNow?:boolean):void=> {

    let m  = Process.findModuleByName(soname);
    if(m!=null) {
        console.log(soname, 'loaded')
        afterFun();
        return;
    }

    var afterDone=false;
    var beforeDone=false;
    let funs:{fname:string, isUtf8:boolean}[] =[];
    if(Process.platform=='linux') {
       funs.push({ fname: 'dlopen',            isUtf8: true})
       funs.push({ fname: 'android_dlopen_ext',isUtf8: true})
    } //['dlopen', 'android_dlopen_ext']

    if (Process.platform == 'windows'){
       funs.push({ fname: 'LoadLibraryA',     isUtf8: true })
       funs.push({ fname: 'LoadLibraryW',     isUtf8: false})
       funs.push({ fname: 'LoadLibraryExA',   isUtf8: true })
       funs.push({ fname: 'LoadLibraryExW',   isUtf8: false})
    }

    funs.forEach(fun=>{
        let funptr = Module.findExportByName(null, fun.fname);
        if(funptr){
            Interceptor.attach(funptr, {
                onEnter: function (args) {
                    let loadpath : string | null =null; 
                    if(fun.isUtf8) loadpath =  args[0].readUtf8String();
                    else loadpath = args[0].readUtf16String();
                    this.loadpath = loadpath;
                    if(loadpath==null) return;
                    if(basename(loadpath)==soname){
                        if(!beforeDone){ 
                            if(beforeFun!=undefined) {beforeFun();}
                        }
                        beforeDone=true;
                    }
                },
                onLeave: function (retval) {
                    if(this.loadpath==undefined) return;
                    if(!afterDone) {
                        if ( retval.toUInt32() != 0) {
                            if (basename(this.loadpath) == soname){
                                afterFun();
                                afterDone=true;
                            }
                        }
                    }
                },
            });
        }
    })
    if(runNow==undefined) runNow=false;
    if(runNow) afterFun();
}



