const vec2 = new Vec2();

const init = () => {
  const content = document.querySelector(".content");
  const cursor = document.querySelector(".cursor");
  const dot = document.querySelector(".dot");
  const width = innerWidth;
  const height = innerHeight;
  
  let mouse = {
    x: 0,
    y: 0
  };
  let lastmouse = { x: 0, y: 0 };

  const gl = {
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    camera: new THREE.PerspectiveCamera(45, 1, 0.1, 10000),
    scene: new THREE.Scene(),
    loader: new THREE.TextureLoader(),
    clock: new THREE.Clock()
  };

  const textures = [
    "fondfleur.jpeg"
  ];

  const loadCanvas = texturesLoaded => {
    const factors = textures.map(d => new THREE.Vector2(1, 1));
    let currentIndex = 0;

    const getPointSize = el => {
      const w = el.getBoundingClientRect().width / 2;
      const h = el.getBoundingClientRect().height / 2;
      return [w, h];
    };

    const [cWidth, cHeight] = getPointSize(cursor);
    const [dotWidth, dotHeight] = getPointSize(dot);

    const uniforms = {
      u_time: { type: "f", value: 0 },
      u_res: {
        type: "v2",
        value: new THREE.Vector2(width, height)
      },
      u_mouse: { type: "v2", value: new THREE.Vector2(0, 0) },
      u_directionMouse: { type: "v2", value: new THREE.Vector2(0, 0) },
      u_text0: { value: texturesLoaded[currentIndex] },
      u_progress: { type: "f", value: 0 },
      u_waveIntensity: { type: "f", value: 0 },
      u_direction: { type: "f", value: 1 },
      u_offset: { type: "f", value: 10 },
      u_volatility: { type: "f", value: 0 },
      u_textureFactor: { type: "v2", value: factors[0] }
    };

    const getPlaneSize = () => {
      const fovRadians = gl.camera.fov * Math.PI / 180;
      const viewSize = Math.abs(
        gl.camera.position.z * Math.tan(fovRadians / 2) * 2
      );

      return [viewSize, viewSize];
    };

    const calculateAspectRatioFactor = (index, texture) => {
      const [width, height] = getPlaneSize();

      const windowRatio = innerWidth / innerHeight;
      const rectRatio = width / height * windowRatio;
      const imageRatio = texture.image.width / texture.image.height;

      let factorX = 1;
      let factorY = 1;
      if (rectRatio > imageRatio) {
        factorX = 1;
        factorY = 1 / rectRatio * imageRatio;
      } else {
        factorX = 1 * rectRatio / imageRatio;
        factorY = 1;
      }

      factors[index] = new THREE.Vector2(factorX, factorY);

      if (currentIndex === index) {
        uniforms.u_textureFactor.value = factors[index];
        uniforms.u_textureFactor.needsUpdate = true;
      }
    };

    const addScene = () => {
      gl.renderer.setSize(width, height);
      gl.renderer.setPixelRatio(devicePixelRatio);

      content.append(gl.renderer.domElement);

      gl.camera.position.z = 5;
      //gl.controls = new THREE.OrbitControls(gl.camera, gl.renderer.domElement);
      gl.scene.add(gl.camera);
      addMesh();
    };

    const addMesh = () => {
      const [width, height] = getPlaneSize();

      const geometry = new THREE.PlaneGeometry(width, height, 60, 60);
      const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.querySelector("#vs").textContent,
        fragmentShader: document.querySelector("#fs").textContent
      });

      gl.mesh = new THREE.Mesh(geometry, material);

      gl.scene.add(gl.mesh);
    };

    const onMouse = interval => {
      const velocity = vec2.dist(lastmouse, mouse) / interval;

      // volatility
      TweenLite.to(uniforms.u_volatility, 1, {
        value: Math.min(vec2.map(velocity, 0, 10, 10, 100), 1.4)
      });

      // mouse direction (edge -1, 1)
      TweenLite.to(uniforms.u_directionMouse.value, 1, {
        x: vec2.clamp(mouse.x - lastmouse.x, -1, 1),
        y: vec2.clamp(mouse.y - lastmouse.y, -1, 1)
      });

      lastmouse = { x: mouse.x, y: mouse.y };
    };

    const pointerMove = (el, m, w, h, t) => {
      TweenLite.to(el, t, {
        x: m.x - w,
        y: (innerHeight - m.y) - h
      })
    };

    const resize = () => {
      const w = innerWidth;
      const h = innerHeight;

      gl.renderer.setSize(w, h);
      //gl.camera.aspect = w / h;

      uniforms.u_res.value.x = w;
      uniforms.u_res.value.y = h;

      for (let [i, texture] of texturesLoaded.entries()) {
        calculateAspectRatioFactor(i, texture);
      }

      gl.camera.updateProjectionMatrix();
    };

    content.addEventListener("mousemove", ({ clientX, clientY }) => {
      mouse.x = clientX;
      mouse.y = innerHeight - clientY;
      
      // mouse position
      TweenLite.to(uniforms.u_mouse.value, 1, {
        x: mouse.x,
        y: mouse.y
      });
      
      pointerMove(dot, mouse, dotWidth, dotHeight, .2);
      pointerMove(cursor, mouse, cWidth, cHeight, .5);
    });

    content.addEventListener("mousedown", () => {
      TweenLite.to(uniforms.u_direction, 1, {
        value: 0,
        ease: Elastic.easeOut.config(.5, 1)
      });

      TweenLite.to(uniforms.u_progress, 0.7, {
        value: 1
      });

      TweenMax.to(uniforms.u_waveIntensity, 5, {
        value: 0.5
      });
    });

    content.addEventListener("mouseup", () => {
      TweenLite.to(uniforms.u_direction, 1, {
        value: 1,
        ease: Elastic.easeOut.config(1, 0.9)
      });

      TweenLite.to(uniforms.u_progress, 0.7, {
        value: 0
      });

      TweenLite.to(uniforms.u_waveIntensity, 0.7, {
        value: 0
      });
    });

    const render = () => gl.renderer.render(gl.scene, gl.camera);

    let start = performance.now();
    const update = () => {
      uniforms.u_time.value = gl.clock.getElapsedTime();

      const now = performance.now();
      const interval = now - start;

      onMouse(interval);

      start = now;

      render();
      requestAnimationFrame(update);
    };

    addScene();
    update();
    resize();
    window.addEventListener("resize", resize);
  };

  let texturesLoaded = [];
  textures.map((texture, i) => {
    gl.loader.load(texture, textLoaded => {
      texturesLoaded.push(textLoaded);
      if (i + 1 === textures.length) {
        loadCanvas(texturesLoaded);
      }
    });
  });
};

init();