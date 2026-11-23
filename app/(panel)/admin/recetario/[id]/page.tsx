import {requireSessionUser} from '@/lib/auth/session';
import {canReadRecipeBook} from '@/data/team-recipe-books';
import {notFound} from 'next/navigation';
import {findRecipeBook,listRecipeBooks} from '@/lib/recipe-book-store';
import {RecipeBookReader} from '@/modules/reader/team-recipe-book-reader';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const user=await requireSessionUser();
 const {id}=await params;
 const book=await findRecipeBook(id);if(!book||!canReadRecipeBook(user,book))notFound();
 return <RecipeBookReader key={id} initialBookId={id} books={(await listRecipeBooks()).filter(item=>canReadRecipeBook(user,item))}/>;
}
