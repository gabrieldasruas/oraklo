"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { formatMoney } from "@/lib/format";
import { BRASIL_BOUNDS, RAIO_MAX_KM, RAIO_MIN_KM, distanciaKm, type Municipio } from "@/lib/geo/radius";

export type Centro = [number, number];
/** auto: mapa de ruas de longe, satélite com nomes das ruas de perto */
export type ModoMapa = "auto" | "mapa" | "satelite";
/** zoom a partir do qual o modo automático troca para satélite */
const ZOOM_SATELITE = 15;

/** Empresa localizada pelo CEP. `destaque` = está entre as mais relevantes (pin grande). */
export type EmpresaNoMapa = {
  cnpj: string;
  name: string;
  lat: number;
  lng: number;
  destaque: boolean;
  /** ainda na sede da cidade, esperando o endereço exato */
  aproximado?: boolean;
  local: string;
  capital: number | null;
};

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const ATRIB = "Mapa &copy; Esri, Maxar, Earthstar Geographics, HERE, Garmin, &copy; colaboradores do OpenStreetMap";

// Pin neon (gota) para as empresas em destaque.
const pinIcon = (foco: boolean, aproximado = false) =>
  L.divIcon({
    className: "",
    iconSize: [22, 28],
    iconAnchor: [11, 27],
    popupAnchor: [0, -26],
    html: `<span class="company-pin ${aproximado ? "company-pin--aprox" : ""} ${foco ? "company-pin--foco" : ""}"><span></span></span>`,
  });

// Alças brancas com borda escura (centro + 4 pontos cardeais).
const handleIcon = (main: boolean) =>
  L.divIcon({
    className: "",
    iconSize: main ? [26, 26] : [20, 20],
    iconAnchor: main ? [13, 13] : [10, 10],
    html: `<span class="radius-handle ${main ? "radius-handle--center" : ""}"></span>`,
  });

/** Pontos nas bordas do círculo (N, L, S, O) para a distância `km`. */
function pontosCardeais([lat, lng]: Centro, km: number): Centro[] {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat + dLat, lng],
    [lat, lng + dLng],
    [lat - dLat, lng],
    [lat, lng - dLng],
  ];
}

// Clique no mapa move o centro; também acompanha o zoom (para o modo automático).
function Eventos({ onMove, onZoom }: { onMove: (c: Centro) => void; onZoom: (z: number) => void }) {
  const map = useMapEvents({
    click(e) {
      onMove([e.latlng.lat, e.latlng.lng]);
    },
    zoomend() {
      onZoom(map.getZoom());
    },
  });
  return null;
}

// Mantém o círculo inteiro à vista quando o raio/centro muda por um controle.
function FitOnRadius({ centro, raioKm, token }: { centro: Centro; raioKm: number; token: number }) {
  const map = useMap();
  useEffect(() => {
    if (!token) return;
    map.flyToBounds(L.latLng(centro[0], centro[1]).toBounds(raioKm * 2000 * 1.1), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return null;
}

// Quando um novo conjunto de empresas é localizado, aproxima o mapa para mostrar todas.
function FitToEmpresas({ empresas, chave }: { empresas: EmpresaNoMapa[]; chave: string }) {
  const map = useMap();
  const assinatura = empresas.length ? chave : "";
  useEffect(() => {
    if (!empresas.length) return;
    const b = L.latLngBounds(empresas.map((e) => [e.lat, e.lng] as [number, number]));
    map.flyToBounds(b.pad(0.2), { duration: 0.8, maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura]);
  return null;
}

// "Ver a rua": voa até uma empresa no nível do satélite.
function VoarPara({ alvo }: { alvo: { lat: number; lng: number; token: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (alvo) map.flyTo([alvo.lat, alvo.lng], 18, { duration: 1.1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo?.token]);
  return null;
}

export default function RadiusMap({
  centro,
  raioKm,
  cidades,
  fitToken,
  circuloAtivo = true,
  empresas = [],
  foco = null,
  onFoco,
  modo = "auto",
  voar = null,
  chaveEnquadrar = "",
  onChange,
}: {
  centro: Centro;
  raioKm: number;
  /** municípios que entram na busca (pontos no mapa) */
  cidades: Municipio[];
  /** muda quando o mapa deve reenquadrar o círculo */
  fitToken: number;
  /** fora do modo raio, o círculo fica tracejado e apagado */
  circuloAtivo?: boolean;
  /** empresas localizadas pelo CEP (pins) */
  empresas?: EmpresaNoMapa[];
  /** CNPJ em destaque (item da lista sob o mouse) */
  foco?: string | null;
  onFoco?: (cnpj: string | null) => void;
  modo?: ModoMapa;
  /** aproxima até este ponto (muda `token` para repetir) */
  voar?: { lat: number; lng: number; token: number } | null;
  /** quando muda, o mapa reenquadra todas as empresas */
  chaveEnquadrar?: string;
  onChange: (centro: Centro, raioKm: number) => void;
}) {
  const [zoom, setZoom] = useState(7);
  const satelite = modo === "satelite" || (modo === "auto" && zoom >= ZOOM_SATELITE);

  const centerIcon = useMemo(() => handleIcon(true), []);
  const edgeIcon = useMemo(() => handleIcon(false), []);
  const pin = useMemo(() => pinIcon(false), []);
  const pinFoco = useMemo(() => pinIcon(true), []);
  const pinAprox = useMemo(() => pinIcon(false, true), []);
  const pinAproxFoco = useMemo(() => pinIcon(true, true), []);
  const [voarLocal, setVoarLocal] = useState<{ lat: number; lng: number; token: number } | null>(null);
  const temEmpresas = empresas.length > 0;

  // último centro aceito pelo pai (se o arraste sair do Brasil, a alça volta para ele)
  const aceito = useRef(centro);
  useEffect(() => {
    aceito.current = centro;
  }, [centro]);
  const cardeais = pontosCardeais(centro, raioKm);

  // no satélite, traço neon para o círculo continuar visível
  const corCirculo = satelite ? "#b8ff3c" : "#0b0b0c";

  const tooltip = (e: EmpresaNoMapa) => (
    <Tooltip direction="top" offset={[0, e.destaque ? -26 : -6]} className="pin-tooltip">
      <span className="block text-[13px] font-medium leading-tight">{e.name}</span>
      <span className="block text-[11px] opacity-60">{e.local}</span>
      <span className="mt-0.5 block font-mono text-[11px]">{formatMoney(e.capital)}</span>
      {e.aproximado && <span className="mt-1 block text-[10px] text-neon">posição aproximada · buscando o endereço…</span>}
    </Tooltip>
  );
  const popup = (e: EmpresaNoMapa) => (
    <Popup>
      <CardEmpresa e={e} onRua={() => setVoarLocal({ lat: e.lat, lng: e.lng, token: Date.now() })} />
    </Popup>
  );

  return (
    <MapContainer
      center={centro}
      zoom={7}
      minZoom={4}
      maxZoom={19}
      maxBounds={BRASIL_BOUNDS}
      maxBoundsViscosity={1}
      worldCopyJump={false}
      className="size-full"
      zoomControl={false}
      attributionControl
    >
      {satelite ? (
        <>
          {/* imagem de satélite + nomes de ruas e lugares por cima */}
          <TileLayer key="sat" url={`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`} attribution={ATRIB} maxNativeZoom={19} maxZoom={19} noWrap />
          <TileLayer key="sat-ruas" url={`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`} maxNativeZoom={19} maxZoom={19} noWrap />
          <TileLayer key="sat-nomes" url={`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`} maxNativeZoom={19} maxZoom={19} noWrap />
        </>
      ) : (
        // mapa de ruas colorido e detalhado
        <TileLayer key="ruas" url={`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`} attribution={ATRIB} maxNativeZoom={19} maxZoom={19} noWrap />
      )}

      <ZoomControl position="bottomright" zoomInTitle="Aproximar" zoomOutTitle="Afastar" />
      <Eventos onMove={(c) => onChange(c, raioKm)} onZoom={setZoom} />
      <FitOnRadius centro={centro} raioKm={raioKm} token={fitToken} />
      <FitToEmpresas empresas={empresas} chave={chaveEnquadrar} />
      <VoarPara alvo={voar} />
      <VoarPara alvo={voarLocal} />

      <Circle
        center={centro}
        radius={raioKm * 1000}
        pathOptions={
          circuloAtivo
            ? { color: corCirculo, weight: 3, fillColor: "#0b0b0c", fillOpacity: satelite ? 0.08 : 0.12, dashArray: undefined }
            : { color: corCirculo, weight: 1.5, fillColor: "#0b0b0c", fillOpacity: 0.03, dashArray: "6 8" }
        }
        interactive={false}
      />

      {/* cidades que entram na busca: pontinhos cinza discretos (pin neon é só para empresa) */}
      {cidades.map((m) => (
        <CircleMarker
          key={m.code}
          center={[m.lat, m.lng]}
          radius={temEmpresas ? 1.5 : 2.5}
          pathOptions={{ color: "#0b0b0c", weight: 0, fillColor: "#0b0b0c", fillOpacity: temEmpresas ? 0.15 : 0.35 }}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            {m.name}/{m.uf}
          </Tooltip>
        </CircleMarker>
      ))}

      {/* empresas comuns: marcação leve */}
      {empresas
        .filter((e) => !e.destaque)
        .map((e) => (
          <CircleMarker
            key={e.cnpj}
            center={[e.lat, e.lng]}
            radius={foco === e.cnpj ? 8 : 5}
            pathOptions={{ color: "#fff", weight: 2, fillColor: foco === e.cnpj ? "#b8ff3c" : "#0b0b0c", fillOpacity: 0.85 }}
            eventHandlers={{ mouseover: () => onFoco?.(e.cnpj), mouseout: () => onFoco?.(null) }}
          >
            {tooltip(e)}
            {popup(e)}
          </CircleMarker>
        ))}

      {/* empresas em destaque: pin neon */}
      {empresas
        .filter((e) => e.destaque)
        .map((e) => (
          <Marker
            key={e.cnpj}
            position={[e.lat, e.lng]}
            icon={e.aproximado ? (foco === e.cnpj ? pinAproxFoco : pinAprox) : foco === e.cnpj ? pinFoco : pin}
            zIndexOffset={foco === e.cnpj ? 1000 : 500}
            eventHandlers={{ mouseover: () => onFoco?.(e.cnpj), mouseout: () => onFoco?.(null) }}
          >
            {tooltip(e)}
            {popup(e)}
          </Marker>
        ))}

      {/* centro: arrasta o círculo inteiro */}
      <Marker
        position={centro}
        icon={centerIcon}
        draggable
        eventHandlers={{
          drag: (e) => {
            const p = (e.target as L.Marker).getLatLng();
            onChange([p.lat, p.lng], raioKm);
          },
          dragend: (e) => (e.target as L.Marker).setLatLng(aceito.current),
        }}
      />

      {/* bordas: arrastar muda o raio */}
      {cardeais.map((p, i) => (
        <Marker
          key={i}
          position={p}
          icon={edgeIcon}
          draggable
          eventHandlers={{
            drag: (e) => {
              const q = (e.target as L.Marker).getLatLng();
              const km = Math.round(distanciaKm(centro[0], centro[1], q.lat, q.lng));
              onChange(centro, Math.min(RAIO_MAX_KM, Math.max(RAIO_MIN_KM, km)));
            },
            // ao soltar, a alça volta para o ponto cardeal do novo raio
            dragend: (e) => (e.target as L.Marker).setLatLng(pontosCardeais(centro, raioKm)[i]),
          }}
        />
      ))}
    </MapContainer>
  );
}

function CardEmpresa({ e, onRua }: { e: EmpresaNoMapa; onRua: () => void }) {
  return (
    <div className="min-w-52 font-display">
      <p className="text-sm font-medium leading-tight text-night">{e.name}</p>
      <p className="mt-0.5 text-xs text-night/60">{e.local}</p>
      <p className="mt-2 text-lg font-light tracking-[-0.03em] text-night">{formatMoney(e.capital)}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onRua}
          className="cursor-pointer rounded-full bg-night px-3 py-1.5 text-[11px] font-medium text-neon"
        >
          Ver a rua
        </button>
        <a href={`/empresas/${e.cnpj}`} className="rounded-full border border-night/15 px-3 py-1.5 text-[11px] font-medium text-night">
          Abrir empresa →
        </a>
      </div>
    </div>
  );
}
