export interface GrupoNode {
  idGrupo: number;
  descripcion: string;
}

export interface SeccionNode {
  idSeccion: number;
  descripcion: string;
  hijos: GrupoNode[];
}

export interface DepartamentoNode {
  idDepartamento: number;
  descripcion: string;
  hijos: SeccionNode[];
}

export interface SubDivisionNode {
  idSubDivision: number;
  descripcion: string;
  hijos: DepartamentoNode[];
}

export interface DivisionNode {
  idDivision: number;
  descripcion: string;
  hijos: SubDivisionNode[];
}

export interface EstructuraComercialNode {
  idEstructuraComercial: number;
  descripcion: string;
  hijos: DivisionNode[];
}