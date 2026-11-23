"use client";

import {useEffect,useRef,useState} from 'react';
import {formatEpisodeTime} from '@/data/podcasts';

type Player={getDuration:()=>number;destroy:()=>void};
type YouTubeAPI={Player:new(target:HTMLElement,options:{events:{onReady:()=>void;onStateChange:()=>void;onError:()=>void}})=>Player};
type YouTubeWindow=Window & {YT?:YouTubeAPI;onYouTubeIframeAPIReady?:()=>void};
let pendingAPI:Promise<YouTubeAPI>|undefined;
function loadYouTubeAPI():Promise<YouTubeAPI>{
 const scope=window as YouTubeWindow;
 if(scope.YT?.Player)return Promise.resolve(scope.YT);
 if(pendingAPI)return pendingAPI;
 pendingAPI=new Promise((resolve,reject)=>{
  const previous=scope.onYouTubeIframeAPIReady;
  const timeout=window.setTimeout(()=>{pendingAPI=undefined;reject(new Error('YouTube no respondió.'));},15000);
  scope.onYouTubeIframeAPIReady=()=>{previous?.();window.clearTimeout(timeout);if(scope.YT?.Player)resolve(scope.YT);else{pendingAPI=undefined;reject(new Error('No se pudo cargar YouTube.'));}};
  const existing=document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
  if(!existing){const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=()=>{window.clearTimeout(timeout);script.remove();pendingAPI=undefined;reject(new Error('No se pudo cargar YouTube.'));};document.head.appendChild(script);}
 });
 return pendingAPI;
}

export function YouTubePreview({videoId,onDuration}:{videoId:string;onDuration:(duration:string)=>void}){
 const host=useRef<HTMLDivElement>(null);
 const report=useRef(onDuration);
 const [status,setStatus]=useState('Reproduce la vista previa para detectar la duración.');
 useEffect(()=>{report.current=onDuration;},[onDuration]);
 useEffect(()=>{
  let cancelled=false;let detected=false;let player:Player|undefined;let polling:number|undefined;let stopPolling:number|undefined;
  const container=host.current;
  const stop=()=>{window.clearInterval(polling);window.clearTimeout(stopPolling);};
  const unavailable=()=>{if(cancelled)return;stop();setStatus('No se pudo detectar la duración. Puedes escribirla manualmente.');};
  const readDuration=()=>{
   if(cancelled||detected||!player)return;
   const seconds=Math.round(player.getDuration());
   if(!Number.isFinite(seconds)||seconds<=0||seconds>86400)return;
   detected=true;stop();report.current(formatEpisodeTime(seconds));setStatus(`Duración detectada: ${formatEpisodeTime(seconds)}. Se incluirá al guardar el episodio.`);
  };
  loadYouTubeAPI().then(api=>{
   if(cancelled||!container)return;
   const iframe=document.createElement('iframe');
   const params=new URLSearchParams({enablejsapi:'1',origin:window.location.origin,rel:'0',playsinline:'1'});
   iframe.src=`https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
   iframe.title='Vista previa del episodio';iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
   iframe.style.cssText='display:block;width:100%;aspect-ratio:16/9;min-height:200px;border:0;border-radius:12px';
   container.appendChild(iframe);
   player=new api.Player(iframe,{events:{onReady:()=>{if(cancelled)return;polling=window.setInterval(readDuration,750);stopPolling=window.setTimeout(stop,45000);readDuration();},onStateChange:readDuration,onError:unavailable}});
  }).catch(unavailable);
  return()=>{cancelled=true;stop();player?.destroy();container?.replaceChildren();};
 },[videoId]);
 return <div><div ref={host}/><p role="status" className="mt-2 text-[11px] leading-5 text-[#8190a4]">{status}</p></div>;
}
