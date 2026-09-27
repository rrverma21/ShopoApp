export const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}';
export const MIME = new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]);
const categories = new Set(['Grocery','Electronics','Fashion','Medicine','Hardware']);
const types = new Set(['New Arrival','Offer','Greeting','Update','Story','Poll']);
export const isUuid = value => typeof value === 'string' && new RegExp(`^${UUID}$`).test(value);
export const signatureValid = (mime, b) => (mime==='image/jpeg'&&b[0]===255&&b[1]===216&&b[2]===255)||(mime==='image/png'&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x))||(mime==='image/webp'&&new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP');
export const validateMedia = ({uid,uploadId,media}) => {
 if(!isUuid(uploadId)||!Array.isArray(media)||media.length>5) return false; const ids=new Set(), paths=new Set();
 for(const x of media){const id=x?.media_id?.toLowerCase(), path=x?.storage_path, mime=x?.mime_type, size=x?.byte_size; if(!isUuid(x?.media_id)||ids.has(id)||paths.has(path)||!MIME.has(mime)||!Number.isSafeInteger(size)||size<=0||size>5242880||typeof path!=='string'||!new RegExp(`^tmp/${uid}/${uploadId}/${x.media_id}\\.${MIME.get(mime)}$`,'i').test(path))return false;ids.add(id);paths.add(path)} return media.reduce((n,x)=>n+x.byte_size,0)<=26214400;
};
export const classify = (role,category,type) => { const r=role==='client'?'customer':role; if(r==='customer')return {ok:true,category:null,postType:null}; if(r==='seller'&&categories.has(category)&&types.has(type))return {ok:true,category,postType:type}; return {ok:false}; };
export const validContent = value => typeof value==='string'&&value.trim().length>0&&value.length<=500;
