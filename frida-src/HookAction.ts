
'use strict';

//////////////////////////////////////////////////
// this object records all runtime info related hook
export type HookActionOpt =  {
    hide        : boolean   ;
    name        : string    ;
    maxhit      : number    ;
};

export abstract class HookAction {

    hide        : boolean   = false;
    name        : string    = 'unknown';
    maxhit      : number    = -1;

    histCount   : number    = 0;

    private static instances: Map<string, HookAction> = new Map<string, HookAction>();

    protected constructor(opts: Partial<HookActionOpt> = {}) {
        // Check if the name already exists to prevent duplicates
        Object.assign(this, opts);
    }

    protected beyondMaxHit () : boolean {
        return this.maxhit > 0 && this.histCount > this.maxhit;
    }

    protected increaseHitCount () {
        if(this.maxhit>0) this.histCount++;
    }

    static getInstance(address: NativePointer): HookAction {
        const found = HookAction.findInstance(address);
        if (found) return found;
        throw Error(`can not found hook by ${address}`);
    }

    static findInstance(address: NativePointer): HookAction | undefined {
        const key = address.toString();
        return this.instances.get(key);
    }

    static addInstance(address: NativePointer, instance:HookAction)  {
        const key = address.toString();
        if (HookAction.instances.has(key)) {
            throw new Error(`An instance with the address "${key}" already exists.`);
        }
        // Add the new instance to the map with the name as the key
        instance.hook(address)
        HookAction.instances.set(key, instance)
    }

    static removeInstance(address: NativePointer): boolean {
        const instance = HookAction.getInstance(address)
        instance.unhook()
        const key = address.toString();
        return this.instances.delete(key);
    }

    static listInstances(): string[] {
        return Array.from(this.instances.keys());
    }

    static removeAllInstances(): void {
        this.instances.forEach((instance, key) => instance.unhook());
        this.instances.clear();
    }

    abstract hook(address:NativePointer): void;

    abstract unhook(): void;

};



