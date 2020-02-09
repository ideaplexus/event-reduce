import { Branches, BddNode, NonRootNode, BooleanString } from './types';
import { nextNodeId } from './util';
import { lastOfArray } from '../util';
import { InternalNode } from './internal-node';
import { LeafNode } from './leaf-node';

export class RootNode implements BddNode {
    readonly type: string = 'RootNode';
    readonly id: string = nextNodeId();
    readonly level: number = 0;
    public branches: Branches = {};
    public deleted = false;


    private levels: Set<number> = new Set();
    private nodesByLevel: Map<number, Set<NonRootNode>> = new Map();

    constructor(
    ) { }

    addNode(node: NonRootNode) {
        const level = node.level;
        this.levels.add(level);
        this.ensureLevelSetExists(level);
        const set = this.nodesByLevel.get(level);
        set?.add(node);
    }

    removeNode(node: NonRootNode) {
        const set = this.nodesByLevel.get(node.level) as Set<NonRootNode>;
        set.delete(node);
    }

    private ensureLevelSetExists(level: number) {
        if (!this.nodesByLevel.has(level)) {
            this.nodesByLevel.set(level, new Set());
        }
    }

    getLevels(): number[] {
        return Array.from(this.levels).sort((a, b) => a - b);
    }

    getNodesOfLevel(level: number): NonRootNode[] {
        this.ensureLevelSetExists(level);
        const set = this.nodesByLevel.get(level) as Set<NonRootNode>;
        return Array.from(set);
    }

    minimize(logState: boolean = false) {
        let done = false;
        while (!done) {
            if (logState) {
                console.log('minimize() itterate once');
            }
            let successCount = 0;
            let lastLevel = lastOfArray(this.getLevels()) - 1;
            while (lastLevel > 0) {
                const nodes: InternalNode[] = this.getNodesOfLevel(lastLevel) as InternalNode[];
                if (logState) {
                    console.log(
                        'minimize() run for level ' + lastLevel +
                        ' with ' + nodes.length + ' nodes'
                    );
                }
                for (const node of nodes) {
                    if (logState) {
                        console.log(
                            'minimize() node #' + node.id
                        );
                    }
                    if (!node.deleted && node.isInternalNode()) {
                        const useNode = node as InternalNode;
                        const reductionDone = useNode.applyReductionRule();
                        const eliminationDone = useNode.applyEliminationRule(nodes);
                        if (reductionDone || eliminationDone) {
                            successCount++;
                        }
                    }
                }
                lastLevel--;
            }
            if (successCount === 0) {
                // could do no more optimisations
                done = true;
            } else {
                if (logState) {
                    console.log(
                        'minimize() itteration done with ' +
                        successCount + ' minimisations'
                    );
                }
            }
        }
    }

    /**
     * strips all leaf-nodes
     * with the given value
     */
    removeIrrelevantLeafNode(leafNodeValue: any) {
        const lastLevel = lastOfArray(this.getLevels());
        const leafNodes = this.getNodesOfLevel(lastLevel).reverse() as LeafNode[];
        for (const leafNode of leafNodes) {
            if (leafNode.value === leafNodeValue) {
                const parent = leafNode.parent;

                console.log(JSON.stringify(parent, null, 2));
                let keepBinKey: BooleanString = '1';
                if (parent.branches['1'] === leafNode) {
                    keepBinKey = '0';
                }
                const keep = parent.branches[keepBinKey];
                parent.branches['0'] = keep;
                parent.branches['1'] = keep;
                leafNode.removeDeep();

                console.log(JSON.stringify(parent, null, 2));
                // process.exit();
            }
        }


        // console.log(JSON.stringify(this.getNodesOfLevel(lastLevel - 1), null, 2));
    }

    countNodes() {
        let ret: number = 0;
        this.getLevels().forEach(level => {
            const nodesAmount = this.getNodesOfLevel(level).length;
            ret = ret + nodesAmount;
        });
        return ret;
    }

    isRootNode(): boolean {
        return true;
    }
    isInternalNode(): boolean {
        return false;
    }
    isLeafNode(): boolean {
        return false;
    }

    public log() {
        console.log(JSON.stringify(this.toJSON(true), null, 2));
    }

    toJSON(withId: boolean = false): any {
        return {
            id: withId ? this.id : undefined,
            type: this.type,
            level: this.level,
            branches: {
                '0': this.branches['0'] ? this.branches['0'].toJSON(withId) : undefined,
                '1': this.branches['1'] ? this.branches['1'].toJSON(withId) : undefined
            }
        };
    }

    branchToString(v: BooleanString) {
        if (this.branches[v]) {
            return (this.branches[v] as NonRootNode).toString();
        } else {
            return '';
        }
    }

    // a strange string-representation
    // to make an equal check between nodes
    toString(): string {
        return '' +
            '<' +
            this.type + ':' + this.level +
            '|0:' + this.branchToString('0') +
            '|1:' + this.branchToString('1') +
            '>';
    }
}