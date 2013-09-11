(function() {
	/*ARGUMENTOS
	
		FUNÇÃO NAMESPACE:
			INVOCAR UM OBJETO ARMAZENADO EM UM NAMESPACE E PASSAR PARA UMA FUNÇÃO DE CALLBACK
			PODE SER PASSADO UM OBJETO COMO ATRIBUTO OPCIONAL, DE MODO A REALIZAR AÇÕES EXTRAS
		
	*/
	if (window.namespace) {
		throw "Object window.namespace is already declared";
	} 
	
	const $library = {};
	var $loaded = false;
	var $execQueue = [];
	var count = 0;
	
	/*
		Função para carregar um script dinâmicamente.
		
		Esta função deve ser executada somente após a página ter sido completamente carregada
		após evento window load
		
		_path : Caminho contendo um arquivo a ser carregado na página
		_callback : Função de retorno a ser executada quando o script tiver sido interpretado
	*/
	window.loadScript = window.loadScript || function loadScript(_path, _callback) {
		if (typeof _path !== "string") {
			throw "";
		}
		if (typeof _callback !== "function") {
			throw "";
		}
		$invoke([], function loadScript() {
			var script = document.createElement("script");
			script.addEventListener("load",_callback);
			script.src = _path;
			script.type="text\/javascript";
			document.head.appendChild(script);
		}, [])
	}
	
	function $create(_path, _object) {
		var $namespace = $library;
		$namespace[_path] = $namespace[_path] || _object;
		
		if ($namespace[_path] !== _object) {
			$namespace[_path] = $merge( $namespace[_path], _object );
		}
		
		$namespace = $namespace[_path];
		
		if (typeof $namespace === "function") {
			$namespace.toString = function toString() { return _path; };
		}
		return $namespace;
	}
	
	function $flushQueue() {
		var exec = $execQueue.shift();
		try {
			exec.func.apply(exec.func, $merge(exec.args, $loadDependencies(exec.dependencies)));
		} catch(e) {
			console.error(e);
		}
		if ($execQueue.length > 0) {
			setTimeout($flushQueue,1);
		} else {
			$loaded = true;
		}
	}
	
	function $mergeWeight(object) {
		var type = typeof object;
		if (type === "function") {
			return 4;
		} else if (type === "object" && [].constructor === object.constructor) {
			return 2;
		} else {
			return 1;
		}
	}
	
	function $processMerge(obj1, obj2) {
		for(var index in obj2) {
			if (obj2.hasOwnProperty(index) && !obj1.hasOwnProperty(index)) {
				obj1[index] = obj2[index];
			}
		}
		return obj1;
	}
	
	function $merge(obj1, obj2) {
		var w1 = $mergeWeight( obj1 );
		var w2 = $mergeWeight( obj2 );
		
		return (w1 > w2) ? $processMerge(obj1,obj2) : $processMerge(obj2,obj1);
	}
	
	function $extend(_object,_path) {
		if (!$library[_path]) {
			throw "Parent object not found in path "+_path;
		}
		_object.uber = $library[_path];
		return _object;
	}
	
	function $loadDependencies(dependencies) {
		var loaded = [];
		
		for(var i=0,arrlength=dependencies.length; i<arrlength; i++) {
			if (typeof dependencies[i] !== "string") {
				throw "Dependencies array contains an invalid type, must contain strings only. Contains "+typeof dependencies[i];
			}
			loaded.push($library[dependencies[i]]);
		}
		
		return loaded;
	}
	
	function $invoke(dependencies, callback, params) {
		if (typeof dependencies !== "object" || dependencies.constructor !== params.constructor) {
			throw "Dependencies argument is of the wrong type, must be an array. Is "+typeof dependencies;
		}
		if (typeof callback !== "function") {
			throw "Callback argument is of the wrong type, must be a function. Is "+typeof callback;
		}
		
		if ($loaded) {
			callback.apply(callback, $merge(params, $loadDependencies(dependencies)));
		} else {
			$execQueue.push({
				func:callback,
				args:params,
				dependencies:dependencies
			});
		}
	}
	
	window.invoke = window.invoke || function invoke(dependencies, callback) {
		$invoke(dependencies,callback,[]);
	};
	
	window.namespace = window.namespace || function namespace(path,obj,args) {
		var params = [];
			
		if (typeof path !== "string") {
			throw "Path argument is of the wrong type, must be string. Is "+typeof path;
		}
		if (typeof obj !== "function" && typeof obj !== "object") {
			throw "Object argument is of the wrong type, must be object or function. Is "+typeof obj;
		}
		
		if (args) {
			if (args.callback) {
				$invoke(args.required, function populate() {
					for(var i=0,l=arguments.length; i<l; i++) {
						params.push( arguments[i] );
					}
				}, []);
				params.push( obj );
				$invoke( [], $create, [path,obj] );
				$invoke( [], args.callback, params );
				return 0;
			}
		}
		
		$invoke( [], $create, [path,obj] );
		return 0;
	};
	loadScript.toString = invoke.toString = namespace.toString = function toString() {return this.name};
	
	Object.freeze(window.namespace);
	Object.freeze(window.invoke);
	Object.freeze(window.loadScript);
	
	window.addEventListener("load", $flushQueue);
})()