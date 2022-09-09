const { IDMapLocal } = require('./IDMapLocal')
const { IDMapRemote } = require('./IDMapRemote')

const createIDMapAuthority = function createIDMapAuthority(remote,idMapData,onUpdate) {
    if( remote ) {
        return new IDMapRemote(idMapData,onUpdate)
    } else {
        return new IDMapLocal(idMapData,onUpdate)
    }
}

exports.createIDMapAuthority = createIDMapAuthority