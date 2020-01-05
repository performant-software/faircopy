const fs = window.fairCopy.fs

const teiSimplePrintODD = 'test-docs/tei_simplePrint.odd'
const teiSpecsDir = '../TEI/P5/Source/Specs'

// on the one hand, you have elements, that are members of classes, which are then members of other classes
// on the other hand you have elements that can contain certain classes or elements

// within an element context, you have classes and elements
// body for example
// or p
// show me relationship between all the classes valid in a p tag, for example
// those classes branch out from p, and then onwards until they reach other elements on perimeter

// we're trying to figure out how content and group in PM might relate to classes and elements in TEI

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

    graphMembers( rootClassName ) {

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
        const links = []

        const buildGraph = (modName) => {
            if( !nodeMap[modName] ) {
                const members = findMembers( modName )
                nodeMap[modName] = {"id": modName, "group": 1 } 
                for( let member of members ) {
                    links.push( {"source": modName, "target": member.name, "value": 1} )
                    buildGraph(member.name)
                }    
            }
        }

        buildGraph(rootClassName)
        const nodes = Object.values(nodeMap)

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
        const moduleXML = fs.readFileSync(moduleFile, "utf8")
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
        let refs = []
        refs = refs.concat( getKeys(contentEl,'classRef') )
        refs = refs.concat( getKeys(contentEl,'elementRef') )
        refs = refs.concat( getKeys(contentEl,'macroRef') )

        return { name: moduleName, memberships, refs }
    }

    // load simple file, locate body els, make a list of their modules
    loadModuleNames() {
        const teiSimpleXML = fs.readFileSync(teiSimplePrintODD, "utf8")
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