export type MarketRelation = 'se_prepara' | 'se_vende' | 'documentada_en';
export const marketRelationLabels: Record<MarketRelation,string> = {se_prepara:'Se prepara aquí',se_vende:'Se vende aquí',documentada_en:'Documentada aquí'};
export type CatalogOption = {id:string;name:string};
export const marketDays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
export type MarketAddress={street:string;exterior:string;interior:string;neighborhood:string;municipalityCode:string;postalCode:string;locality:string;reference:string;legacy?:string};
export type MarketHours={day:number;opens:string;closes:string;nextDay:boolean};
export const blankMarketAddress:MarketAddress={street:'',exterior:'',interior:'',neighborhood:'',municipalityCode:'',postalCode:'',locality:'',reference:''};
export type MarketForm = {
 name:string; type:'mercado'|'tianguis'; description:string; sourceId:string; observationDate:string;
 address:MarketAddress;hours:MarketHours[];
 newSource?:{title:string;reference:string;typeId:string};
 recipes:{id:string;relationship:MarketRelation}[];
 ingredients:{id:string;availability:string}[];
 people:{id:string;participationId:string}[];
};
export type MarketRecord = MarketForm & {id:string;updatedAt:string;canEdit:boolean};
export type MarketCatalogs = {
 recipes:CatalogOption[];ingredients:CatalogOption[];people:CatalogOption[];
 sources:CatalogOption[];sourceTypes:CatalogOption[];participations:CatalogOption[];canCreate:boolean;
};
export const blankMarket:MarketForm={name:'',type:'mercado',description:'',sourceId:'',observationDate:'',address:blankMarketAddress,hours:[],recipes:[],ingredients:[],people:[]};
