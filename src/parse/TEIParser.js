
const fs = window.nodeAppDependencies.fs

export default class TEIParser {


/* <lg type="stanza">
    <l>Piping down the valleys wild, </l>
    <l>Piping songs of pleasant glee, </l>
    <l>On a cloud I saw a child, </l>
    <l>And he laughing said to me: </l>
</lg> */

    parse( filePath ) {
        const text = fs.readFileSync(filePath, "utf8")
        parser = new DOMParser();
        xmlDoc = parser.parseFromString(text, "text/xml");

        // TODO create an HTML document as the target
        // convert xml -> doc node

        // Find line group
        // create a line group node?

        // load lines?
        

    }

}