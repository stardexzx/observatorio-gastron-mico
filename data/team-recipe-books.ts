import type { SessionUser } from '@/lib/auth/types';

export type RecipeBook={status:'draft'|'published';ownerId?:string;deletedAt?:string;pdfAsset?:string;coverAsset?:string;id:string;title:string;subtitle:string;description:string;cover:string;pages:number;filename:string;publisher:string;edition:string;isbn:string;author?:string;year?:string;contents:{title:string;page:number}[]};
// Datos editoriales tomados de los créditos del PDF (página 2).
export const recipeBooks:RecipeBook[]=[{
 id:'cocina-dig-2',
 status:'published',
 title:'Puebla, la cocina de México',
 subtitle:'Recetario · 2022–2023',
 description:'Un recorrido por los sabores de Puebla a través de sus recetas. Una publicación para conocer y preparar platillos de la cocina poblana.',
 cover:'/recetarios/cocina-dig-2-cover.png',
 pages:97,
 filename:'cocina-dig-2.pdf',
 publisher:'Instituto Municipal de Arte y Cultura de Puebla',
 edition:'Primera edición, 2022',
 isbn:'978-607-8123-72-8',
 contents:[
  {title:'Portada',page:1},
  {title:'Créditos editoriales',page:2},
  {title:'Presentación',page:3},
  {title:'Índice de la publicación',page:4},
 ],
}];

export function canReadRecipeBook(user: SessionUser, book: RecipeBook) {
 return book.status === 'published' || user.role !== 'capturista' || book.ownerId === user.id;
}
export function canManageRecipeBook(user: SessionUser, book: RecipeBook) {
 return user.role === 'administrador' || (user.role === 'capturista' && book.ownerId === user.id && book.status === 'draft');
}
