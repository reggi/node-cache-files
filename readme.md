# Cache Files

I wanted a way to cache values from a promise. I came up with this way of assigning a file and prepending the file name with the date, and pulling a file if it's under the age limit.

## Example

Here's an example of keeping a cached version of `google.html` alive for one hour.

```javascript
var request = require("request-promise")
var Cache = require("./index")

var cache = new Cache("./cache/google.html")

cache.read(3600)
  .then(function(existing){
    if(existing) return existing
    return request("http://google.com")
      .then(function(response){
        return cache.write(response)
      }.bind(cache))
  }.bind(cache))
  .then(console.log)
  .catch(function(e){
    throw e
  })
```
