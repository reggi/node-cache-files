var debug = require("debug")("check-cache")
var url = require("url")
var path = require("path")
var Promise = require("bluebird")
var fs = Promise.promisifyAll(require("fs"))
var _ = require("underscore")
var moment = require("moment")

function Cache(fileUrl){
  this.fileUrl = fileUrl
}

Cache.prototype.write = function(content){
  var file = path.parse(this.fileUrl)
  content = (file.ext == ".json") ? JSON.stringify(content, null, 2) : content
  var newFile = _.clone(file)
  newFile.base = [file.name, "-", moment().format("X"), file.ext].join("")
  newFile.format = path.format(newFile)
  return fs.writeFileAsync(newFile.format, content)
}

Cache.prototype.read = function(secondsLive){
  secondsLive = (secondsLive) ? secondsLive : false
  // parse file
  var file = path.parse(this.fileUrl)
  // get timestamp position
  file.timestampPosition = (file.name.match(/\-/g) || []).length + 1
  file.newBase = [file.name, "-", moment().format("X"), file.ext].join("")
  // get list of everything in directory
  return fs.readdirAsync(file.dir)
    .then(function(dirFiles){
      // process the files in the dir
      return _.chain(dirFiles)
        .map(function(dirFile){
          // parse the dirFile
          dirFile = path.parse(dirFile)
          dirFile.withoutTimestamp = dirFile.name.split("-").splice(0, file.timestampPosition).join("-")
          dirFile.timestamp = dirFile.name.split("-")[file.timestampPosition]
          return dirFile
        })
        .filter(function(dirFile){
          // filter dir files where string without timestamp don't match
          return dirFile.withoutTimestamp == file.name
        })
        .filter(function(dirFile){
          // filter out files where length is invalid
          return dirFile.base.length == file.newBase.length
        })
        .sortBy("timestamp")
        .last()
        .value()
    }).then(function(latestFile){
      if(!latestFile) return false
      // convert the timestamp to moment
      latestFile.moment = moment(latestFile.timestamp, "X")
      // get the unix timestamp from seconds ago (TTL)
      var secondsAgo = moment().subtract(secondsLive, "seconds")
      // if cache is out of date return false
      if(latestFile.moment.isBefore(secondsAgo)) return false
      // assign the latestFile.dir to the file dir
      latestFile.dir = file.dir
      latestFile.format = path.format(latestFile)
      return latestFile
    })
    .then(function(latestFile){
      if(!latestFile) return latestFile
      return fs.readFileAsync(latestFile.format, "utf8").then(function(content){
        if(latestFile.ext == ".json") return JSON.parse(content)
        return content
      })
    })
}

module.exports = Cache
