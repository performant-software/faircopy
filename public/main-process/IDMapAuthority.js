const { IDMapLocal } = require('./IDMapLocal')
const { IDMapRemote } = require('./IDMapRemote')

const createIDMapAuthority = function createIDMapAuthority(remote,idMapData,fairCopyApplication) {
    if( remote ) {
        return new IDMapRemote(idMapData,fairCopyApplication)
    } else {
        return new IDMapLocal(idMapData,fairCopyApplication)
    }
}

exports.createIDMapAuthority = createIDMapAuthority