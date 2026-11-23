import {requireSessionUser} from '@/lib/auth/session';
import {canReadRecipeBook} from '@/data/team-recipe-books';
import {Toaster} from '@/components/ui/sonner';
import {listRecipeBooks} from '@/lib/recipe-book-store';
import {RecipeBookCatalog} from '@/modules/reader/recipe-book-catalog';
export const metadata={title:'Recetario · Observatorio Gastronómico de Puebla'};
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireSessionUser();return <><RecipeBookCatalog initialBooks={(await listRecipeBooks()).filter(book=>canReadRecipeBook(user,book))}/><Toaster position="bottom-right" richColors/></>;}
