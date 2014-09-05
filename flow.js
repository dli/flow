var SIMULATION_VERTEX_SHADER_SOURCE = [
    'precision highp float;',

    'attribute vec2 a_position;',

    'void main () {',
        'gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
].join('\n');

var SIMULATION_FRAGMENT_SHADER_SOURCE = [
    'precision highp float;',

    'uniform sampler2D u_particleTexture;',
    'uniform sampler2D u_spawnTexture;',

    'uniform vec2 u_resolution;',

    'uniform float u_deltaTime;',
    'uniform float u_time;',

    'uniform float u_persistence;',

    'const int OCTAVES = ' + NOISE_OCTAVES.toFixed(0) + ';',

    'vec4 mod289(vec4 x) {',
        'return x - floor(x * (1.0 / 289.0)) * 289.0;',
    '}',

    'float mod289(float x) {',
        'return x - floor(x * (1.0 / 289.0)) * 289.0;',
    '}',

    'vec4 permute(vec4 x) {',
        'return mod289(((x*34.0)+1.0)*x);',
    '}',

    'float permute(float x) {',
        'return mod289(((x*34.0)+1.0)*x);',
    '}',

    'vec4 taylorInvSqrt(vec4 r) {',
        'return 1.79284291400159 - 0.85373472095314 * r;',
    '}',

    'float taylorInvSqrt(float r) {',
        'return 1.79284291400159 - 0.85373472095314 * r;',
    '}',

    'vec4 grad4(float j, vec4 ip) {',
        'const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);',
        'vec4 p,s;',

        'p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;',
        'p.w = 1.5 - dot(abs(p.xyz), ones.xyz);',
        's = vec4(lessThan(p, vec4(0.0)));',
        'p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; ',

        'return p;',
    '}',

    '#define F4 0.309016994374947451',

    'vec4 simplexNoiseDerivatives (vec4 v) {',
        'const vec4  C = vec4( 0.138196601125011,0.276393202250021,0.414589803375032,-0.447213595499958);',

        'vec4 i  = floor(v + dot(v, vec4(F4)) );',
        'vec4 x0 = v -   i + dot(i, C.xxxx);',

        'vec4 i0;',
        'vec3 isX = step( x0.yzw, x0.xxx );',
        'vec3 isYZ = step( x0.zww, x0.yyz );',
        'i0.x = isX.x + isX.y + isX.z;',
        'i0.yzw = 1.0 - isX;',
        'i0.y += isYZ.x + isYZ.y;',
        'i0.zw += 1.0 - isYZ.xy;',
        'i0.z += isYZ.z;',
        'i0.w += 1.0 - isYZ.z;',

        'vec4 i3 = clamp( i0, 0.0, 1.0 );',
        'vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );',
        'vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );',

        'vec4 x1 = x0 - i1 + C.xxxx;',
        'vec4 x2 = x0 - i2 + C.yyyy;',
        'vec4 x3 = x0 - i3 + C.zzzz;',
        'vec4 x4 = x0 + C.wwww;',

        'i = mod289(i); ',
        'float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);',
        'vec4 j1 = permute( permute( permute( permute (',
                 'i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))',
               '+ i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))',
               '+ i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))',
               '+ i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));',


        'vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;',

        'vec4 p0 = grad4(j0,   ip);',
        'vec4 p1 = grad4(j1.x, ip);',
        'vec4 p2 = grad4(j1.y, ip);',
        'vec4 p3 = grad4(j1.z, ip);',
        'vec4 p4 = grad4(j1.w, ip);',

        'vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));',
        'p0 *= norm.x;',
        'p1 *= norm.y;',
        'p2 *= norm.z;',
        'p3 *= norm.w;',
        'p4 *= taylorInvSqrt(dot(p4,p4));',

        'vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2));', //value of contributions from each corner at point
        'vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));',

        'vec3 m0 = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);', //(0.5 - x^2) where x is the distance
        'vec2 m1 = max(0.5 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);',

        'vec3 temp0 = -6.0 * m0 * m0 * values0;',
        'vec2 temp1 = -6.0 * m1 * m1 * values1;',

        'vec3 mmm0 = m0 * m0 * m0;',
        'vec2 mmm1 = m1 * m1 * m1;',

        'float dx = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;',
        'float dy = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;',
        'float dz = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;',
        'float dw = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;',

        'return vec4(dx, dy, dz, dw) * 49.0;',
    '}',

    'void main () {',
        'vec2 textureCoordinates = gl_FragCoord.xy / u_resolution;',
        'vec4 data = texture2D(u_particleTexture, textureCoordinates);',

        'vec3 oldPosition = data.rgb;',

        'vec3 noisePosition = oldPosition * ' + NOISE_POSITION_SCALE.toFixed(8) + ';',

        'float noiseTime = u_time * ' + NOISE_TIME_SCALE.toFixed(8) + ';',

        'vec4 xNoisePotentialDerivatives = vec4(0.0);',
        'vec4 yNoisePotentialDerivatives = vec4(0.0);',
        'vec4 zNoisePotentialDerivatives = vec4(0.0);',

        'float persistence = u_persistence;',

        'for (int i = 0; i < OCTAVES; ++i) {',
            'float scale = (1.0 / 2.0) * pow(2.0, float(i));',

            'float noiseScale = pow(persistence, float(i));',
            'if (persistence == 0.0 && i == 0) {', //fix undefined behaviour
                'noiseScale = 1.0;',
            '}',

            'xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(noisePosition * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;',
            'yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((noisePosition + vec3(123.4, 129845.6, -1239.1)) * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;',
            'zNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((noisePosition + vec3(-9519.0, 9051.0, -123.0)) * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;',
        '}',

        //compute curl
        'vec3 noiseVelocity = vec3(',
            'zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],',
            'xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],',
            'yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]',
        ') * ' + NOISE_SCALE.toFixed(8) + ';',

        'vec3 velocity = vec3(' + BASE_SPEED.toFixed(8) + ', 0.0, 0.0);',
        'vec3 totalVelocity = velocity + noiseVelocity;',

        'vec3 newPosition = oldPosition + totalVelocity * u_deltaTime;',

        'float oldLifetime = data.a;',
        'float newLifetime = oldLifetime - u_deltaTime;',

        'vec4 spawnData = texture2D(u_spawnTexture, textureCoordinates);',

        'if (newLifetime < 0.0) {',
            'newPosition = spawnData.rgb;',
            'newLifetime = spawnData.a + newLifetime;',
        '}',

        'gl_FragColor = vec4(newPosition, newLifetime);',
    '}'
].join('\n');

var RENDERING_VERTEX_SHADER_SOURCE = [
    'precision highp float;',

    'attribute vec2 a_textureCoordinates;',

    'varying vec3 v_position;',

    'varying float v_opacity;',

    'uniform sampler2D u_particleTexture;',

    'uniform sampler2D u_opacityTexture;',

    'uniform mat4 u_viewMatrix;',
    'uniform mat4 u_projectionMatrix;',

    'uniform mat4 u_lightViewProjectionMatrix;',

    'uniform float u_particleDiameter;',
    'uniform float u_screenWidth;',

    'void main () {',
        'vec3 position = texture2D(u_particleTexture, a_textureCoordinates).rgb;',
        'v_position = position;',

        'vec2 lightTextureCoordinates = vec2(u_lightViewProjectionMatrix * vec4(position, 1.0)) * 0.5 + 0.5;',
        'v_opacity = texture2D(u_opacityTexture, lightTextureCoordinates).a;',

        'vec3 viewSpacePosition = vec3(u_viewMatrix * vec4(position, 1.0));',
        'vec4 corner = vec4(u_particleDiameter * 0.5, u_particleDiameter * 0.5, viewSpacePosition.z, 1.0);',
        'float projectedCornerX = dot(vec4(u_projectionMatrix[0][0], u_projectionMatrix[1][0], u_projectionMatrix[2][0], u_projectionMatrix[3][0]), corner);',
        'float projectedCornerW = dot(vec4(u_projectionMatrix[0][3], u_projectionMatrix[1][3], u_projectionMatrix[2][3], u_projectionMatrix[3][3]), corner);',
        'gl_PointSize = u_screenWidth * 0.5 * projectedCornerX * 2.0 / projectedCornerW;',

        'gl_Position = u_projectionMatrix * vec4(viewSpacePosition, 1.0);',

        'if (position.y < ' + FLOOR_ORIGIN[1].toFixed(8) + ') gl_Position = vec4(9999999.0, 9999999.0, 9999999.0, 1.0);',
    '}'
].join('\n');

var RENDERING_FRAGMENT_SHADER_SOURCE = [
    'precision highp float;',

    'varying vec3 v_position;',
    'varying float v_opacity;',

    'uniform float u_particleAlpha;',

    'uniform vec3 u_particleColor;',

    'uniform bool u_flipped;', //non-flipped is front-to-back, flipped is back-to-front

    'void main () {',
        'float distanceFromCenter = distance(gl_PointCoord.xy, vec2(0.5, 0.5));',
        'if (distanceFromCenter > 0.5) discard;',
        'float alpha = clamp(1.0 - distanceFromCenter * 2.0, 0.0, 1.0) * u_particleAlpha;',

        'vec3 color = (1.0 - v_opacity * ' + PARTICLE_OPACITY_SCALE.toFixed(8) + ') * u_particleColor;',

        'gl_FragColor = vec4(color * alpha, alpha);',
    '}'
].join('\n');

var OPACITY_VERTEX_SHADER_SOURCE = [
    'precision highp float;',

    'attribute vec2 a_textureCoordinates;',

    'uniform sampler2D u_particleTexture;',

    'uniform mat4 u_lightViewMatrix;',
    'uniform mat4 u_lightProjectionMatrix;',

    'uniform float u_particleDiameter;',
    'uniform float u_screenWidth;',

    'void main () {',
        'vec3 position = texture2D(u_particleTexture, a_textureCoordinates).rgb;',

        'vec3 viewSpacePosition = vec3(u_lightViewMatrix * vec4(position, 1.0));',

        'vec4 corner = vec4(u_particleDiameter * 0.5, u_particleDiameter * 0.5, viewSpacePosition.z, 1.0);',

        'float projectedCornerX = dot(vec4(u_lightProjectionMatrix[0][0], u_lightProjectionMatrix[1][0], u_lightProjectionMatrix[2][0], u_lightProjectionMatrix[3][0]), corner);',
        'float projectedCornerW = dot(vec4(u_lightProjectionMatrix[0][3], u_lightProjectionMatrix[1][3], u_lightProjectionMatrix[2][3], u_lightProjectionMatrix[3][3]), corner);',

        'gl_PointSize = u_screenWidth * 0.5 * projectedCornerX * 2.0 / projectedCornerW;',

        'gl_Position = u_lightProjectionMatrix * vec4(viewSpacePosition, 1.0);',
    '}'
].join('\n');

var OPACITY_FRAGMENT_SHADER_SOURCE = [
    'precision highp float;',

    'uniform float u_particleAlpha;',

    'void main () {',
        'float distanceFromCenter = distance(gl_PointCoord.xy, vec2(0.5, 0.5));',
        'if (distanceFromCenter > 0.5) discard;',
        'float alpha = clamp(1.0 - distanceFromCenter * 2.0, 0.0, 1.0) * u_particleAlpha;',

        'gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);', //under operator requires this premultiplication
    '}'
].join('\n');

var SORT_VERTEX_SHADER_SOURCE = [
    'precision highp float;',

    'attribute vec2 a_position;',

    'void main () {',
        'gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
].join('\n');

var SORT_FRAGMENT_SHADER_SOURCE = [
    'precision highp float;',

    'uniform sampler2D u_dataTexture;',

    'uniform vec2 u_resolution;',

    'uniform float pass;',
    'uniform float stage;',

    'uniform vec3 u_cameraPosition;',

    'uniform vec3 u_halfVector;',

    'void main () {',
        'vec2 normalizedCoordinates = gl_FragCoord.xy / u_resolution;',

        'vec4 self = texture2D(u_dataTexture, normalizedCoordinates);',

        'float i = floor(normalizedCoordinates.x * u_resolution.x) + floor(normalizedCoordinates.y * u_resolution.y) * u_resolution.x;',

        'float j = floor(mod(i, 2.0 * stage));',

        'float compare = 0.0;',

        'if ((j < mod(pass, stage)) || (j > (2.0 * stage - mod(pass, stage) - 1.0))) {',
            'compare = 0.0;',
        '} else {',
            'if (mod((j + mod(pass, stage)) / pass, 2.0) < 1.0) {',
                'compare = 1.0;',
            '} else {',
                'compare = -1.0;',
            '}',
        '}',

        'float adr = i + compare * pass;',

        'vec4 partner = texture2D(u_dataTexture, vec2(floor(mod(adr, u_resolution.x)) / u_resolution.x, floor(adr / u_resolution.x) / u_resolution.y));',

        'float selfProjectedLength = dot(u_halfVector, self.xyz);',
        'float partnerProjectedLength = dot(u_halfVector, partner.xyz);',

        'gl_FragColor = (selfProjectedLength * compare < partnerProjectedLength * compare) ? self : partner;',
    '}'
].join('\n');

var RESAMPLE_VERTEX_SHADER_SOURCE = [
    'precision highp float;',

    'attribute vec2 a_position;',
    'varying vec2 v_coordinates;',

    'void main () {',
        'v_coordinates = a_position.xy * 0.5 + 0.5;',
        'gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
].join('\n');

var RESAMPLE_FRAGMENT_SHADER_SOURCE = [
    'precision highp float;',

    'varying vec2 v_coordinates;',

    'uniform sampler2D u_particleTexture;',
    'uniform sampler2D u_offsetTexture;',

    'uniform float u_offsetScale;',

    'void main () {',
        'vec4 data = texture2D(u_particleTexture, v_coordinates);',
        'vec4 offset = texture2D(u_offsetTexture, v_coordinates);',
        'vec3 position = data.rgb + offset.rgb * u_offsetScale;',
        'gl_FragColor = vec4(position, data.a);',
    '}'
].join('\n');

var FLOOR_VERTEX_SHADER_SOURCE = [
    'precision highp float;',

    'attribute vec3 a_vertexPosition;',

    'varying vec3 v_position;',

    'uniform mat4 u_viewMatrix;',
    'uniform mat4 u_projectionMatrix;',

    'void main () {',
        'v_position = a_vertexPosition;',
        'gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_vertexPosition, 1.0);',
    '}'
].join('\n');

var FLOOR_FRAGMENT_SHADER_SOURCE = [
    'precision highp float;',

    'varying vec3 v_position;',

    'uniform sampler2D u_opacityTexture;',

    'uniform mat4 u_lightViewProjectionMatrix;',

    'void main () {',
        'vec2 lightTextureCoordinates = vec2(u_lightViewProjectionMatrix * vec4(v_position, 1.0)) * 0.5 + 0.5;',
        'float opacity = texture2D(u_opacityTexture, lightTextureCoordinates).a;',

        'if (lightTextureCoordinates.x < 0.0 || lightTextureCoordinates.x > 1.0 || lightTextureCoordinates.y < 0.0 || lightTextureCoordinates.y > 1.0) {',
            'opacity = 0.0;',
        '}',

        'gl_FragColor = vec4(0.0, 0.0, 0.0, opacity * 0.5);',
    '}'
].join('\n');

var BACKGROUND_VERTEX_SHADER_SOURCE = [
    'precision highp float;',

    'attribute vec2 a_position;',

    'varying vec2 v_position;',

    'void main () {',
        'v_position = a_position;',
        'gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
].join('\n');

var BACKGROUND_FRAGMENT_SHADER_SOURCE = [
    'precision highp float;',

    'varying vec2 v_position;',

    'void main () {',
        'float dist = length(v_position);',
        'gl_FragColor = vec4(vec3(1.0) - dist * ' + BACKGROUND_DISTANCE_SCALE.toFixed(8) + ', 1.0);',
    '}'
].join('\n');

var Camera = function (element) {
    var azimuth = INITIAL_AZIMUTH,
        elevation = INITIAL_ELEVATION;

    var lastMouseX = 0,
        lastMouseY = 0;

    var mouseDown = false;

    var viewMatrix = new Float32Array(16);

    this.getViewMatrix = function () {
        return viewMatrix;
    };

    this.getPosition = function () {
        var cameraPosition = new Float32Array(3);
        cameraPosition[0] = CAMERA_DISTANCE * Math.sin(Math.PI / 2 - elevation) * Math.sin(-azimuth) + CAMERA_ORBIT_POINT[0];
        cameraPosition[1] = CAMERA_DISTANCE * Math.cos(Math.PI / 2 - elevation) + CAMERA_ORBIT_POINT[1];
        cameraPosition[2] = CAMERA_DISTANCE * Math.sin(Math.PI / 2 - elevation) * Math.cos(-azimuth) + CAMERA_ORBIT_POINT[2];

        return cameraPosition;
    };

    this.getViewDirection = function () {
        var viewDirection = new Float32Array(3);
        viewDirection[0] = -Math.sin(Math.PI / 2 - elevation) * Math.sin(-azimuth);
        viewDirection[1] = -Math.cos(Math.PI / 2 - elevation);
        viewDirection[2] = -Math.sin(Math.PI / 2 - elevation) * Math.cos(-azimuth);

        return viewDirection;
    };

    var recomputeViewMatrix = function () {
        var xRotationMatrix = new Float32Array(16),
            yRotationMatrix = new Float32Array(16),
            distanceTranslationMatrix = makeIdentityMatrix(new Float32Array(16)),
            orbitTranslationMatrix = makeIdentityMatrix(new Float32Array(16));

        makeIdentityMatrix(viewMatrix);

        makeXRotationMatrix(xRotationMatrix, elevation);
        makeYRotationMatrix(yRotationMatrix, azimuth);
        distanceTranslationMatrix[14] = -CAMERA_DISTANCE;
        orbitTranslationMatrix[12] = -CAMERA_ORBIT_POINT[0];
        orbitTranslationMatrix[13] = -CAMERA_ORBIT_POINT[1];
        orbitTranslationMatrix[14] = -CAMERA_ORBIT_POINT[2];

        premultiplyMatrix(viewMatrix, viewMatrix, orbitTranslationMatrix);
        premultiplyMatrix(viewMatrix, viewMatrix, yRotationMatrix);
        premultiplyMatrix(viewMatrix, viewMatrix, xRotationMatrix);
        premultiplyMatrix(viewMatrix, viewMatrix, distanceTranslationMatrix);
    };

    element.addEventListener('mousedown', function (event) {
        mouseDown = true;
        lastMouseX = getMousePosition(event, element).x;
        lastMouseY = getMousePosition(event, element).y;
    });

    document.addEventListener('mouseup', function (event) {
        mouseDown = false;
    });

    element.addEventListener('mousemove', function (event) {
        if (mouseDown) {
            var mouseX = getMousePosition(event, element).x;
            var mouseY = getMousePosition(event, element).y;

            var deltaAzimuth = (mouseX - lastMouseX) * CAMERA_SENSITIVITY;
            var deltaElevation = (mouseY - lastMouseY) * CAMERA_SENSITIVITY;

            azimuth += deltaAzimuth;
            elevation += deltaElevation;

            if (elevation < MIN_ELEVATION) {
                elevation = MIN_ELEVATION;
            } else if (elevation > MAX_ELEVATION) {
                elevation = MAX_ELEVATION;
            }

            recomputeViewMatrix();

            lastMouseX = mouseX;
            lastMouseY = mouseY;

            element.style.cursor = '-webkit-grabbing';
            element.style.cursor = '-moz-grabbing';
            element.style.cursor = 'grabbing';
        } else {
            element.style.cursor = '-webkit-grab';
            element.style.cursor = '-moz-grab';
            element.style.cursor = 'grab';
        }
    });

    recomputeViewMatrix();
};

var Flow = function (canvas) {
    var options = {
        premultipliedAlpha: false,
        alpha: true
    };

    var gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
    gl.getExtension('OES_texture_float');
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    var maxParticleCount = QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[0] * QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[1];

    var randomNumbers = [];
    for (var i = 0; i < maxParticleCount; ++i) {
        randomNumbers[i] = Math.random();
    }

    var randomSpherePoints = [];
    for (var i = 0; i < maxParticleCount; ++i) {
        var point = randomPointInSphere();
        randomSpherePoints.push(point);
    }

    var particleVertexBuffer;
    var spawnTexture;

    var particleVertexBuffers = []; //one for each quality level
    var spawnTextures = []; //one for each quality level

    for (var i = 0; i < QUALITY_LEVELS.length; ++i) {
        var width = QUALITY_LEVELS[i].resolution[0];
        var height = QUALITY_LEVELS[i].resolution[1];

        var count = width * height;

        particleVertexBuffers[i] = gl.createBuffer();

        var particleTextureCoordinates = new Float32Array(width * height * 2);
        for (var y = 0; y < height; ++y) {
            for (var x = 0; x < width; ++x) {
                particleTextureCoordinates[(y * width + x) * 2] = (x + 0.5) / width;
                particleTextureCoordinates[(y * width + x) * 2 + 1] = (y + 0.5) / height;
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffers[i]);
        gl.bufferData(gl.ARRAY_BUFFER, particleTextureCoordinates, gl.STATIC_DRAW);

        delete particleTextureCoordinates;

        var spawnData = new Float32Array(count * 4);
        for (var j = 0; j < count; ++j) {
            var position = randomSpherePoints[j];

            var positionX = position[0] * SPAWN_RADIUS;
            var positionY = position[1] * SPAWN_RADIUS;
            var positionZ = position[2] * SPAWN_RADIUS;
            var lifetime = BASE_LIFETIME + randomNumbers[j] * MAX_ADDITIONAL_LIFETIME;

            spawnData[j * 4] = positionX;
            spawnData[j * 4 + 1] = positionY;
            spawnData[j * 4 + 2] = positionZ;
            spawnData[j * 4 + 3] = lifetime;
        }

        spawnTextures[i] = buildTexture(gl, 0, gl.RGBA, gl.FLOAT, width, height, spawnData, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);

        delete spawnData;
    }

    var offsetData = new Float32Array(maxParticleCount * 4);
    for (var i = 0; i < maxParticleCount; ++i) {
        var position = randomSpherePoints[i];

        var positionX = position[0] * OFFSET_RADIUS;
        var positionY = position[1] * OFFSET_RADIUS;
        var positionZ = position[2] * OFFSET_RADIUS;

        offsetData[i * 4] = positionX;
        offsetData[i * 4 + 1] = positionY;
        offsetData[i * 4 + 2] = positionZ;
        offsetData[i * 4 + 3] = 0.0;
    }

    var offsetTexture = buildTexture(gl, 0, gl.RGBA, gl.FLOAT, QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[0], QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[1], offsetData, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);

    delete randomNumbers;
    delete randomSpherePoints;
    delete offsetData;

    var particleCountWidth = 0;
    var particleCountHeight = 0;
    var particleCount = particleCountWidth * particleCountHeight;

    var particleDiameter = 0.0;
    var particleAlpha = 0.0;

    var changingParticleCount = false;
    var oldParticleDiameter;
    var oldParticleCountWidth;
    var oldParticleCountHeight;

    var particleTextureA = buildTexture(gl, 0, gl.RGBA, gl.FLOAT, 1, 1, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);
    var particleTextureB = buildTexture(gl, 0, gl.RGBA, gl.FLOAT, 1, 1, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);

    var camera = new Camera(canvas);

    var projectionMatrix = makePerspectiveMatrix(new Float32Array(16), PROJECTION_FOV, ASPECT_RATIO, PROJECTION_NEAR, PROJECTION_FAR);

    var lightViewMatrix = new Float32Array(16); 
    makeLookAtMatrix(lightViewMatrix, [0.0, 0.0, 0.0], LIGHT_DIRECTION, LIGHT_UP_VECTOR);
    var lightProjectionMatrix = makeOrthographicMatrix(new Float32Array(16), LIGHT_PROJECTION_LEFT, LIGHT_PROJECTION_RIGHT, LIGHT_PROJECTION_BOTTOM, LIGHT_PROJECTION_TOP, LIGHT_PROJECTION_NEAR, LIGHT_PROJECTION_FAR);

    var lightViewProjectionMatrix = new Float32Array(16);
    premultiplyMatrix(lightViewProjectionMatrix, lightViewMatrix, lightProjectionMatrix);

    var hue = 0;
    var timeScale = INITIAL_SPEED;
    var persistence = INITIAL_TURBULENCE;

    this.setHue = function (newHue) {
        hue = newHue;
    };

    this.setTimeScale = function (newTimeScale) {
        timeScale = newTimeScale;
    };

    this.setPersistence = function (newPersistence) {
        persistence = newPersistence;
    };

    var resampleFramebuffer = gl.createFramebuffer();

    var qualityLevel = -1;

    this.changeQualityLevel = function (newLevel) {
        qualityLevel = newLevel;

        particleAlpha = QUALITY_LEVELS[qualityLevel].alpha;
        changingParticleCount = true;

        oldParticleDiameter = particleDiameter;
        particleDiameter = QUALITY_LEVELS[qualityLevel].diameter;

        oldParticleCountWidth = particleCountWidth;
        oldParticleCountHeight = particleCountHeight;
        particleCountWidth = QUALITY_LEVELS[qualityLevel].resolution[0];
        particleCountHeight = QUALITY_LEVELS[qualityLevel].resolution[1];

        particleCount = particleCountWidth * particleCountHeight;
    }

    this.changeQualityLevel(0);

    //variables used for sorting
    var totalSortSteps = (log2(particleCount) * (log2(particleCount) + 1)) / 2;
    var sortStepsLeft = totalSortSteps;
    var sortPass = -1;
    var sortStage = -1;

    var opacityTexture = buildTexture(gl, 0, gl.RGBA, gl.UNSIGNED_BYTE, OPACITY_TEXTURE_RESOLUTION, OPACITY_TEXTURE_RESOLUTION, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.LINEAR, gl.LINEAR); //opacity from the light's point of view

    var simulationFramebuffer = gl.createFramebuffer();
    var sortFramebuffer = gl.createFramebuffer();

    var opacityFramebuffer = buildFramebuffer(gl, opacityTexture);

    var simulationProgramWrapper = buildProgramWrapper(gl, 
        buildShader(gl, gl.VERTEX_SHADER, SIMULATION_VERTEX_SHADER_SOURCE),
        buildShader(gl, gl.FRAGMENT_SHADER, SIMULATION_FRAGMENT_SHADER_SOURCE),
        { 'a_position': 0 }
    );

    var renderingProgramWrapper = buildProgramWrapper(gl, 
        buildShader(gl, gl.VERTEX_SHADER, RENDERING_VERTEX_SHADER_SOURCE),
        buildShader(gl, gl.FRAGMENT_SHADER, RENDERING_FRAGMENT_SHADER_SOURCE),
        { 'a_textureCoordinates': 0 }
    );

    var opacityProgramWrapper = buildProgramWrapper(gl, 
        buildShader(gl, gl.VERTEX_SHADER, OPACITY_VERTEX_SHADER_SOURCE),
        buildShader(gl, gl.FRAGMENT_SHADER, OPACITY_FRAGMENT_SHADER_SOURCE),
        { 'a_textureCoordinates': 0 }
    );

    var sortProgramWrapper = buildProgramWrapper(gl, 
        buildShader(gl, gl.VERTEX_SHADER, SORT_VERTEX_SHADER_SOURCE),
        buildShader(gl, gl.FRAGMENT_SHADER, SORT_FRAGMENT_SHADER_SOURCE),
        { 'a_position': 0 }
    );

    var resampleProgramWrapper = buildProgramWrapper(gl, 
        buildShader(gl, gl.VERTEX_SHADER, RESAMPLE_VERTEX_SHADER_SOURCE),
        buildShader(gl, gl.FRAGMENT_SHADER, RESAMPLE_FRAGMENT_SHADER_SOURCE),
        { 'a_position': 0 }
    );

    var floorProgramWrapper = buildProgramWrapper(gl,
        buildShader(gl, gl.VERTEX_SHADER, FLOOR_VERTEX_SHADER_SOURCE),
        buildShader(gl, gl.FRAGMENT_SHADER, FLOOR_FRAGMENT_SHADER_SOURCE),
        { 'a_vertexPosition': 0}
    );

    var backgroundProgramWrapper = buildProgramWrapper(gl,
        buildShader(gl, gl.VERTEX_SHADER, BACKGROUND_VERTEX_SHADER_SOURCE),
        buildShader(gl, gl.FRAGMENT_SHADER, BACKGROUND_FRAGMENT_SHADER_SOURCE),
        { 'a_position': 0}
    );

    var fullscreenVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), gl.STATIC_DRAW);

    var floorVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, floorVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        FLOOR_ORIGIN[0], FLOOR_ORIGIN[1], FLOOR_ORIGIN[2],
        FLOOR_ORIGIN[0], FLOOR_ORIGIN[1], FLOOR_ORIGIN[2] + FLOOR_HEIGHT,
        FLOOR_ORIGIN[0] + FLOOR_WIDTH, FLOOR_ORIGIN[1], FLOOR_ORIGIN[2],
        FLOOR_ORIGIN[0] + FLOOR_WIDTH, FLOOR_ORIGIN[1], FLOOR_ORIGIN[2] + FLOOR_HEIGHT
    ]), gl.STATIC_DRAW);


    var onresize = function () {
        var aspectRatio = window.innerWidth / window.innerHeight;
        makePerspectiveMatrix(projectionMatrix, PROJECTION_FOV, aspectRatio, PROJECTION_NEAR, PROJECTION_FAR);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', onresize);
    onresize();


    var firstFrame = true;


    var flipped = false;

    var lastTime = 0.0;
    var render = function render (currentTime) {
        var deltaTime = (currentTime - lastTime) / 1000 || 0.0;
        lastTime = currentTime;

        if (deltaTime > MAX_DELTA_TIME) {
            deltaTime = 0;
        }

        if (changingParticleCount) {
            deltaTime = 0;
            changingParticleCount = false;

            particleVertexBuffer = particleVertexBuffers[qualityLevel];
            spawnTexture = spawnTextures[qualityLevel];

            //reset sort
            totalSortSteps = (log2(particleCount) * (log2(particleCount) + 1)) / 2;
            sortStepsLeft = totalSortSteps;
            sortPass = -1;
            sortStage = -1;

            if (oldParticleCountHeight === 0 && oldParticleCountWidth === 0) { //initial generation
                var particleData = new Float32Array(particleCount * 4);

                for (var i = 0; i < particleCount; ++i) {
                    var position = randomPointInSphere();

                    var positionX = position[0] * SPAWN_RADIUS;
                    var positionY = position[1] * SPAWN_RADIUS;
                    var positionZ = position[2] * SPAWN_RADIUS;

                    particleData[i * 4] = positionX;
                    particleData[i * 4 + 1] = positionY;
                    particleData[i * 4 + 2] = positionZ;
                    particleData[i * 4 + 3] = Math.random() * BASE_LIFETIME;
                }

                gl.bindTexture(gl.TEXTURE_2D, particleTextureA);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, particleCountWidth, particleCountHeight, 0, gl.RGBA, gl.FLOAT, particleData);

                delete particleData;

                gl.bindTexture(gl.TEXTURE_2D, particleTextureB);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, particleCountWidth, particleCountHeight, 0, gl.RGBA, gl.FLOAT, null);
            } else {
                //resample from A into B
                gl.bindTexture(gl.TEXTURE_2D, particleTextureB);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, particleCountWidth, particleCountHeight, 0, gl.RGBA, gl.FLOAT, null);

                gl.enableVertexAttribArray(0);
                gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer);
                gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

                gl.enableVertexAttribArray(0);

                gl.useProgram(resampleProgramWrapper.program);
                gl.uniform1i(resampleProgramWrapper.uniformLocations['u_particleTexture'], 0);
                gl.uniform1i(resampleProgramWrapper.uniformLocations['u_offsetTexture'], 1);

                if (particleCount > oldParticleCountWidth * oldParticleCountHeight) { //if we are upsampling we need to add random sphere offsets
                    gl.uniform1f(resampleProgramWrapper.uniformLocations['u_offsetScale'], oldParticleDiameter);
                } else { //if downsampling we can just leave positions as they are
                    gl.uniform1f(resampleProgramWrapper.uniformLocations['u_offsetScale'], 0);
                }

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, particleTextureA);

                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, offsetTexture);

                gl.bindFramebuffer(gl.FRAMEBUFFER, resampleFramebuffer);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, particleTextureB, 0);

                gl.viewport(0, 0, particleCountWidth, particleCountHeight);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

                gl.bindTexture(gl.TEXTURE_2D, particleTextureA);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, particleCountWidth, particleCountHeight, 0, gl.RGBA, gl.FLOAT, null);

                var temp = particleTextureA;
                particleTextureA = particleTextureB;
                particleTextureB = temp;
            }
        }


        var flippedThisFrame = false; //if the order reversed this frame

        var viewDirection = camera.getViewDirection();

        var halfVector;

        if (dotVectors(viewDirection, LIGHT_DIRECTION) > 0.0) {
            halfVector = new Float32Array([
                LIGHT_DIRECTION[0] + viewDirection[0],
                LIGHT_DIRECTION[1] + viewDirection[1],
                LIGHT_DIRECTION[2] + viewDirection[2],
            ]);
            normalizeVector(halfVector, halfVector);

            if (flipped) {
                flippedThisFrame = true;
            }

            flipped = false;
        } else {
            halfVector = new Float32Array([
                LIGHT_DIRECTION[0] - viewDirection[0],
                LIGHT_DIRECTION[1] - viewDirection[1],
                LIGHT_DIRECTION[2] - viewDirection[2],
            ]);
            normalizeVector(halfVector, halfVector);

            if (!flipped) {
                flippedThisFrame = true;
            }

            flipped = true;
        }

        gl.disable(gl.DEPTH_TEST);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        for (var i = 0; i < (firstFrame ? BASE_LIFETIME / PRESIMULATION_DELTA_TIME : 1); ++i) {
            gl.enableVertexAttribArray(0);
            gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

            gl.useProgram(simulationProgramWrapper.program);
            gl.uniform2f(simulationProgramWrapper.uniformLocations['u_resolution'], particleCountWidth, particleCountHeight);
            gl.uniform1f(simulationProgramWrapper.uniformLocations['u_deltaTime'], firstFrame ? PRESIMULATION_DELTA_TIME : deltaTime * timeScale);
            gl.uniform1f(simulationProgramWrapper.uniformLocations['u_time'], firstFrame ? PRESIMULATION_DELTA_TIME : currentTime);
            gl.uniform1i(simulationProgramWrapper.uniformLocations['u_particleTexture'], 0);

            gl.uniform1f(simulationProgramWrapper.uniformLocations['u_persistence'], persistence);

            gl.uniform1i(simulationProgramWrapper.uniformLocations['u_spawnTexture'], 1);

            gl.disable(gl.BLEND);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, spawnTexture);

            //render from A -> B
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, particleTextureA);

            gl.bindFramebuffer(gl.FRAMEBUFFER, simulationFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, particleTextureB, 0);

            //swap A and B
            var temp = particleTextureA;
            particleTextureA = particleTextureB;
            particleTextureB = temp;

            gl.viewport(0, 0, particleCountWidth, particleCountHeight);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            if (firstFrame) gl.flush();
        }

        firstFrame = false;

        gl.disable(gl.BLEND);

        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        if (flippedThisFrame) { //if the order reversed this frame sort everything
            sortPass = -1;
            sortStage = -1;
            sortStepsLeft = totalSortSteps;
        }
        
        for (var i = 0; i < (flippedThisFrame ? totalSortSteps : SORT_PASSES_PER_FRAME); ++i) {
            sortPass--;
            if (sortPass < 0) {
                sortStage++;
                sortPass = sortStage;
            }

            gl.useProgram(sortProgramWrapper.program);

            gl.uniform1i(sortProgramWrapper.uniformLocations['u_dataTexture'], 0);
            gl.uniform2f(sortProgramWrapper.uniformLocations['u_resolution'], particleCountWidth, particleCountHeight);

            gl.uniform1f(sortProgramWrapper.uniformLocations['pass'], 1 << sortPass);
            gl.uniform1f(sortProgramWrapper.uniformLocations['stage'], 1 << sortStage);

            gl.uniform3fv(sortProgramWrapper.uniformLocations['u_halfVector'], halfVector);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, particleTextureA);

            gl.bindFramebuffer(gl.FRAMEBUFFER, sortFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, particleTextureB, 0);

            gl.viewport(0, 0, particleCountWidth, particleCountHeight);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            var temp = particleTextureA;
            particleTextureA = particleTextureB;
            particleTextureB = temp;

            sortStepsLeft--;

            if (sortStepsLeft === 0) {
                sortStepsLeft = totalSortSteps;
                sortPass = -1;
                sortStage = -1;
            }
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, opacityFramebuffer);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (var i = 0; i < SLICES; ++i) {
            //render particles
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);

            gl.useProgram(renderingProgramWrapper.program);

            gl.uniform1i(renderingProgramWrapper.uniformLocations['u_particleTexture'], 0);
            gl.uniform1i(renderingProgramWrapper.uniformLocations['u_opacityTexture'], 1);

            gl.uniformMatrix4fv(renderingProgramWrapper.uniformLocations['u_viewMatrix'], false, camera.getViewMatrix());
            gl.uniformMatrix4fv(renderingProgramWrapper.uniformLocations['u_projectionMatrix'], false, projectionMatrix);

            gl.uniformMatrix4fv(renderingProgramWrapper.uniformLocations['u_lightViewProjectionMatrix'], false, lightViewProjectionMatrix);

            gl.uniform1f(renderingProgramWrapper.uniformLocations['u_particleDiameter'], particleDiameter);
            gl.uniform1f(renderingProgramWrapper.uniformLocations['u_screenWidth'], canvas.width);

            gl.uniform1f(renderingProgramWrapper.uniformLocations['u_particleAlpha'], particleAlpha);

            var colorRGB = hsvToRGB(hue, PARTICLE_SATURATION, PARTICLE_VALUE);
            gl.uniform3f(renderingProgramWrapper.uniformLocations['u_particleColor'], colorRGB[0], colorRGB[1], colorRGB[2]);

            gl.uniform1i(renderingProgramWrapper.uniformLocations['u_flipped'], flipped ? 1 : 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, particleTextureA);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, opacityTexture);

            gl.enableVertexAttribArray(0);
            gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffer);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

            
            if (!flipped) {
                gl.enable(gl.BLEND);
                gl.blendEquation(gl.FUNC_ADD, gl.FUNC_ADD);
                gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);
            } else {
                gl.enable(gl.BLEND);
                gl.blendEquation(gl.FUNC_ADD, gl.FUNC_ADD);
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            }

            gl.drawArrays(gl.POINTS, i * (particleCount / SLICES), particleCount / SLICES);

            //render to opacity texture
            gl.bindFramebuffer(gl.FRAMEBUFFER, opacityFramebuffer);

            gl.viewport(0, 0, OPACITY_TEXTURE_RESOLUTION, OPACITY_TEXTURE_RESOLUTION);

            gl.useProgram(opacityProgramWrapper.program);

            gl.uniform1i(opacityProgramWrapper.uniformLocations['u_particleTexture'], 0);

            gl.uniformMatrix4fv(opacityProgramWrapper.uniformLocations['u_lightViewMatrix'], false, lightViewMatrix);
            gl.uniformMatrix4fv(opacityProgramWrapper.uniformLocations['u_lightProjectionMatrix'], false, lightProjectionMatrix);

            gl.uniform1f(opacityProgramWrapper.uniformLocations['u_particleDiameter'], particleDiameter);
            gl.uniform1f(opacityProgramWrapper.uniformLocations['u_screenWidth'], OPACITY_TEXTURE_RESOLUTION);

            gl.uniform1f(opacityProgramWrapper.uniformLocations['u_particleAlpha'], particleAlpha);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, particleTextureA);

            gl.enableVertexAttribArray(0);
            gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffer);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

            gl.drawArrays(gl.POINTS, i * (particleCount / SLICES), particleCount / SLICES);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.useProgram(floorProgramWrapper.program);

        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, floorVertexBuffer);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(floorProgramWrapper.uniformLocations['u_viewMatrix'], false, camera.getViewMatrix());
        gl.uniformMatrix4fv(floorProgramWrapper.uniformLocations['u_projectionMatrix'], false, projectionMatrix);

        gl.uniformMatrix4fv(floorProgramWrapper.uniformLocations['u_lightViewProjectionMatrix'], false, lightViewProjectionMatrix);

        gl.uniform1i(floorProgramWrapper.uniformLocations['u_opacityTexture'], 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, opacityTexture);

        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD, gl.FUNC_ADD);
        gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        gl.useProgram(backgroundProgramWrapper.program);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        requestAnimationFrame(render);
    };
    render();
};