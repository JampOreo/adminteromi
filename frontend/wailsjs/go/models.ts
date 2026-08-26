export namespace main {
	
	export class ProductData {
	    nombre: string;
	    costoFinal: number;
	    precioFinal: number;
	    precioMayor: number;
	    imagen: string;
	
	    static createFrom(source: any = {}) {
	        return new ProductData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nombre = source["nombre"];
	        this.costoFinal = source["costoFinal"];
	        this.precioFinal = source["precioFinal"];
	        this.precioMayor = source["precioMayor"];
	        this.imagen = source["imagen"];
	    }
	}

}

