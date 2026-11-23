import {canReadRecipeBook} from '@/data/team-recipe-books';
import {readFile} from 'node:fs/promises';
import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth/session';
import {findRecipeBook,recipeBookCoverPath} from '@/lib/recipe-book-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const user=await getSessionUser();if(!user)return new Response(null,{status:401});const {id}=await params;const book=await findRecipeBook(id);const path=book&&canReadRecipeBook(user,book)?recipeBookCoverPath(id,book.coverAsset):null;if(!path)return new Response(null,{status:404});return new Response(await readFile(path),{headers:{'Content-Type':'image/png','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});}catch{return NextResponse.json({error:'No se pudo abrir la portada.'},{status:404});}
}
