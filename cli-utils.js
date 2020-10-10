const commaSeparatedList = (value) => {
    return value.split(",")
}

const verifyFileIsRequirable = (path) => {
    if(!path) {
        return
    }
    try {
        return require(path);
    } catch(e) {
        console.log(e);
        throw(`File at ${path} must exist and be require-able`)
    }
}

module.exports = {commaSeparatedList, verifyFileIsRequirable}