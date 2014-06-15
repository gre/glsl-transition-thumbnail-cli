var program = require('commander');
var GlslTransitionThumbnail = require("glsl-transition-thumbnail");
var Q = require("q");
var _ = require("lodash");
var Qimage = require("qimage");
var WebGL = require("node-webgl");
var fs = require("fs");

var document = WebGL.document();
var Image = WebGL.Image;

// Configure libs for this context
Qimage.Image = Image;
GlslTransitionThumbnail.getDocument = function () {
  return document;
};

function resolveUniforms (uniforms) {
  return Q(uniforms); // FIXME In the future we will have to resolve the uniform textures
}

/////////////////////
// Parameters

var pkg = require("./package.json");

program
  .version(pkg.version)
  .description(pkg.description)
  .option("-g, --glsl <glsl>", "The GLSL source (a file or the source code)", function (glsl) {
    return glsl.match(/\.glsl$/) ? Q.nfcall(fs.readFile, glsl, "utf8") : Q(glsl);
  })
  .option("-u, --uniforms [json]", "The uniforms in json format", _.compose(resolveUniforms, JSON.parse), Q({}))
  .option("-f, --from [image]", "The from image file", Qimage, Q(null))
  .option("-t, --to [image]", "The to image file", Qimage, Q(null))
  .option("-p, --progress [float]", "The progress between 0.0 and 1.0 to screenshot with", 0.4)
  .option("-w, --width [int]", "The width to use in the validation", function (s) { return parseInt(s, 10); }, 64)
  .option("-h, --height [int]", "The height to use in the validation", function (s) { return parseInt(s, 10); }, 64)
  .option("-o, --output [file]", "The output file (stdout is used if not provided)", function (fn) { return fs.createWriteStream(fn); }, process.stdout)
  .parse(process.argv);

/////////////////////
// Make a thumbnail

Q .all([ program.glsl, program.from, program.to, program.uniforms ])

  .spread(function makeThumbnail (glsl, from, to, uniforms) {
    var allUniforms = _.extend({ from: from, to: to }, uniforms);
    return GlslTransitionThumbnail(program.width, program.height, glsl, allUniforms, program.progress);
  })

  .then(function writeResult (pixels) {
    // FIXME find a good format to output
    program.output.write(["P3\n# gl.ppm\n", program.width, " ", program.height, "\n255\n"].join(""));
    for(var i=0; i<pixels.length; ++i) {
      program.output.write(pixels[i] + " ");
    }
    program.output.end();
  })

  .done();

