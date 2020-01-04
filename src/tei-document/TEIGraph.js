const fs = window.fairCopy.fs

const teiSimplePrintODD = 'test-docs/tei_simplePrint.odd'
const teiSpecsDir = '../TEI/P5/Source/Specs'

export default class TEIGraph {

    constructor() {
        this.modules = {}
    }

    load() {

        // recursively load module dependencies
        const loadMemberships = (mod) => {
            for( const className of mod.memberships ) {
                if( !this.modules[className] ) {
                    const mod = this.loadModule(className)
                    this.modules[className] = mod
                    loadMemberships(mod)
                }
            }
        }

        const moduleNames = this.loadModuleNames()
        for( const moduleName of moduleNames ) {
             const mod = this.loadModule(moduleName)
             this.modules[moduleName] = mod
             loadMemberships(mod)
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

        debugger
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

        // return JSON.parse(fs.readFileSync('test-docs/miserable.json', "utf8"))
    }

    loadModule( moduleName ) {
        const moduleFile = `${teiSpecsDir}/${moduleName}.xml`
        const moduleXML = fs.readFileSync(moduleFile, "utf8")
        const parser = new DOMParser();
        const moduleDOM = parser.parseFromString(moduleXML, "text/xml");

        const classesEl = moduleDOM.getElementsByTagName('classes')[0];
        const classesChildren = classesEl ? classesEl.childNodes : []
        const memberships = []

        for (let i = 0; i < classesChildren.length; i++) {
            const classEl = classesChildren[i]
            if( classEl.localName === 'memberOf') {
                const key = classEl.getAttribute('key')
                if( key.startsWith('model.') ) {
                    memberships.push( key )    
                }
            }
        }

        // TODO parse content
        // const contentEl = moduleDOM.getElementsByTagName('content')[0];
        // get all the element and class refs from content


        return { name: moduleName, memberships }
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

           // TODO
        // Need to look into the content and classess els of the xml files listed in the simple odd
        // What are we graphing exactly?
//         <classes>
        //     <memberOf key="att.global"/>
        //     <memberOf key="model.pPart.transcriptional"/>
        //     <memberOf key="model.linePart"/>
        //     <memberOf key="att.transcriptional"/>
        //     <memberOf key="att.placement"/>
        //     <memberOf key="att.typed"/>
        //     <memberOf key="att.dimensions"/>
    //   </classes>
//   <content>
//     <macroRef key="macro.paraContent"/>
//   </content>

        // on the one hand, you have elements, that are members of classes, which are then members of other classes
        // on the other hand you have elements that can contain certain classes or elements

        // within an element context, you have classes and elements
        // body for example
        // or p
        // show me relationship between all the classes valid in a p tag, for example
        // those classes branch out from p, and then onwards until they reach other elements on perimeter

        // we're trying to figure out how content and group in PM might relate to classes and elements in TEI

}