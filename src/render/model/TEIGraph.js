

/////////////
//// NOTE: This module is obsolete and will need to be refactored in order to run
////////////

const fairCopy = window.fairCopy

const teiSimplePrintODD = 'scripts/tei_simplePrint.odd'
const teiSpecsDir = '../TEI/P5/Source/Specs'

export default class TEIGraph {

    constructor() {
        this.modules = {}
    }

    load() {

        // recursively load module dependencies
        const loadDependencies = (mod) => {
            const deps = mod.memberships.concat( mod.refs )
            for( const dep of deps ) {
                if( !this.modules[dep] ) {
                    const mod = this.loadModule(dep)
                    this.modules[dep] = mod
                    loadDependencies(mod)
                }
            }
        }

        const moduleNames = this.loadModuleNames()
        for( const moduleName of moduleNames ) {
             const mod = this.loadModule(moduleName)
             this.modules[moduleName] = mod
             loadDependencies(mod)
        }
    }

    graphMembers( rootClassName, followRefs ) {

        const findMembers = (className) => {
            const members = []
            for( let mod of Object.values(this.modules) ) {
                for( let membership of mod.memberships ) {
                    if( membership === className ) {
                        members.push(mod)
                    }    
                }
            }
            return members            
        }

        const nodeMap = {}
        const linkMap = {}

        const buildGraph = (modName) => {
            if( !nodeMap[modName] ) {
                nodeMap[modName] = {"id": modName, "group": 1 } 
            }
            const members = findMembers( modName )
            for( let member of members ) {
                const linkID = `${modName}-${member.name}`
                if( !linkMap[linkID] ) {
                    linkMap[linkID] = { "source": modName, "target": member.name, "value": 1}
                    buildGraph(member.name)
                } 
            }
            if( followRefs ) {
                const mod = this.modules[modName]
                for( let ref of mod.refs ) {
                    const linkID = `${modName}-${ref}`
                    if( !linkMap[linkID] ) {
                        linkMap[linkID] = { "source": modName, "target": ref, "value": 1}
                        buildGraph(ref)
                    }
                }            
            }
        }

        buildGraph(rootClassName)
        const nodes = Object.values(nodeMap)
        const links = Object.values(linkMap)
        return { nodes, links }
    }

    graphMembership( rootElementName ) {

        const subTree = {}

        const growSubTree = (modName) => {
            if( !subTree[modName] ) {
                subTree[modName] = this.modules[modName]
                const {memberships} = subTree[modName]
                for( let className of memberships ) {
                    growSubTree(className)
                }                        
            }
        }

        growSubTree(rootElementName)
        
        const nodes = [], links = []
        for( const mod of Object.values(subTree) ) {
            nodes.push( {"id": mod.name, "group": 1 } )
            for( let className of mod.memberships ) {
                links.push( {"source": mod.name, "target": className, "value": 1} )
            }
        }

        return { nodes, links }
    }

    loadModule( moduleName ) {
        const moduleFile = `${teiSpecsDir}/${moduleName}.xml`
        const moduleXML = fairCopy.readFileSync(moduleFile)
        const parser = new DOMParser();
        const moduleDOM = parser.parseFromString(moduleXML, "text/xml");

        const getKeys = (el,keyTag) => {
            const keys = []
            const tags = el ? el.getElementsByTagName(keyTag) : []

            for (let i = 0; i < tags.length; i++) {
                const tagEl = tags[i]
                if( keyTag === tagEl.localName )  {
                    const key = tagEl.getAttribute('key')
                    if( !key.startsWith('att.') ) {
                        keys.push( key )    
                    }
                }
            } 
            return keys   
        }

        const classesEl = moduleDOM.getElementsByTagName('classes')[0];
        const memberships = getKeys(classesEl,'memberOf')

        const contentEl = moduleDOM.getElementsByTagName('content')[0];
        const refs = [ 
            ...getKeys(contentEl,'classRef'),
            ...getKeys(contentEl,'elementRef'),
            ...getKeys(contentEl,'macroRef') 
        ]

        return { name: moduleName, memberships, refs }
    }

    // load simple file, locate body els, make a list of their modules
    loadModuleNames() {
        const teiSimpleXML = fairCopy.readFileSync(teiSimplePrintODD)
        const parser = new DOMParser();
        const simpleDOM = parser.parseFromString(teiSimpleXML, "text/xml");

        // really need xpath here
        const specGroups = simpleDOM.getElementsByTagName('specGrp');
        const specEls = specGroups[4].childNodes;
        const moduleNames = []

        for (let i = 0; i < specEls.length; i++) {
            const specEl = specEls[i]
            if( specEl.localName === 'elementRef') {
                moduleNames.push( specEl.getAttribute('key') )    
            }
        }

        return moduleNames
    }
}