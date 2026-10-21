"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { formatMoney } from "@/lib/format";
import { BRASIL_BOUNDS, RAIO_MAX_KM, RAIO_MIN_KM, distanciaKm, type Municipio } from "@/lib/geo/radius";

export type Centro = [number, number];

/** Empresa localizada pelo CEP. `destaque` = está entre as mais relevantes (pin grande). */
export type EmpresaNoMapa = {
  cnpj: string;
  name: string;
  lat: number;
  lng: number;
  destaque: boolean;
  local: string;
  capital: number | null;
};

// Pin neon (gota) para as empresas em destaque.
const pinIcon = (foco: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [30, 38],
    iconAnchor: [15, 36],
    popupAnchor: [0, -34],
    html: `<span class="company-pin ${foco ? "company-pin--foco" : ""}"><span></span></span>`,
  });

// Alças brancas com borda escura, como na referência (centro + 4 pontos cardeais).
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

// Clique no mapa move o centro.
function ClickToMove({ onMove }: { onMove: (c: Centro) => void }) {
  useMapEvents({
    click(e) {
      onMove([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Mantém o círculo inteiro à vista quando o raio muda bastante (ex.: pelo controle deslizante).
function FitOnRadius({ centro, raioKm, token }: { centro: Centro; raioKm: number; token: number }) {
  const map = useMap();
  useEffect(() => {
    if (!token) return;
    map.flyToBounds(L.latLng(centro[0], centro[1]).toBounds(raioKm * 2000 * 1.15), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return null;
}

// Quando um novo conjunto de empresas é localizado, aproxima o mapa para mostrar todas.
function FitToEmpresas({ empresas }: { empresas: EmpresaNoMapa[] }) {
  const map = useMap();
  const assinatura = empresas.length ? `${empresas[0].cnpj}:${empresas.length}` : "";
  useEffect(() => {
    if (!empresas.length) return;
    const b = L.latLngBounds(empresas.map((e) => [e.lat, e.lng] as [number, number]));
    map.flyToBounds(b.pad(0.25), { duration: 0.8, maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura]);
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
  onChange,
}: {
  centro: Centro;
  raioKm: number;
  /** municípios dentro do raio (pontos neon no mapa) */
  cidades: Municipio[];
  /** muda quando o mapa deve reenquadrar o círculo */
  fitToken: number;
  /** fora do modo raio, o círculo fica tracejado e apagado */
  circuloAtivo?: boolean;
  /** empresas localizadas pelo CEP (pins) */
  empresas?: EmpresaNoMapa[];
  /** CNPJ em destaque (linha da tabela sob o mouse) */
  foco?: string | null;
  onFoco?: (cnpj: string | null) => void;
  onChange: (centro: Centro, raioKm: number) => void;
}) {
  const centerIcon = useMemo(() => handleIcon(true), []);
  const pin = useMemo(() => pinIcon(false), []);
  const pinFoco = useMemo(() => pinIcon(true), []);
  const temEmpresas = empresas.length > 0;
  const edgeIcon = useMemo(() => handleIcon(false), []);
  // último centro aceito pelo pai (se o arraste sair do Brasil, a alça volta para ele)
  const aceito = useRef(centro);
  useEffect(() => {
    aceito.current = centro;
  }, [centro]);
  const cardeais = pontosCardeais(centro, raioKm);

  return (
    <MapContainer
      center={centro}
      zoom={7}
      minZoom={4}
      maxZoom={13}
      maxBounds={BRASIL_BOUNDS}
      maxBoundsViscosity={1}
      worldCopyJump={false}
      className="size-full"
      zoomControl={false}
      attributionControl
    >
      {/* mapa cinza-claro (Esri, sem chave de API) + camada de nomes por cima */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Mapa &copy; Esri, HERE, Garmin, &copy; colaboradores do OpenStreetMap"
        maxNativeZoom={16}
        noWrap
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={16}
        noWrap
      />
      <ClickToMove onMove={(c) => onChange(c, raioKm)} />
      <FitOnRadius centro={centro} raioKm={raioKm} token={fitToken} />
      <FitToEmpresas empresas={empresas} />

      <Circle
        center={centro}
        radius={raioKm * 1000}
        pathOptions={
          circuloAtivo
            ? { color: "#0b0b0c", weight: 3, fillColor: "#0b0b0c", fillOpacity: 0.16, dashArray: undefined }
            : { color: "#0b0b0c", weight: 1.5, fillColor: "#0b0b0c", fillOpacity: 0.04, dashArray: "6 8" }
        }
        interactive={false}
      />

      {/* cidades dentro do raio */}
      {cidades.map((m) => (
        <CircleMarker
          key={m.code}
          center={[m.lat, m.lng]}
          radius={temEmpresas ? 2 : 3.5}
          pathOptions={
            temEmpresas
              ? { color: "#0b0b0c", weight: 0, fillColor: "#0b0b0c", fillOpacity: 0.18 }
              : { color: "#0b0b0c", weight: 1, fillColor: "#b8ff3c", fillOpacity: 1 }
          }
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
            radius={foco === e.cnpj ? 7 : 4}
            pathOptions={{ color: "#fff", weight: 1.5, fillColor: foco === e.cnpj ? "#b8ff3c" : "#0b0b0c", fillOpacity: 0.75 }}
            eventHandlers={{ mouseover: () => onFoco?.(e.cnpj), mouseout: () => onFoco?.(null) }}
          >
            <Popup>
              <CardEmpresa e={e} />
            </Popup>
          </CircleMarker>
        ))}

      {/* empresas em destaque: pin neon */}
      {empresas
        .filter((e) => e.destaque)
        .map((e) => (
          <Marker
            key={e.cnpj}
            position={[e.lat, e.lng]}
            icon={foco === e.cnpj ? pinFoco : pin}
            zIndexOffset={foco === e.cnpj ? 1000 : 500}
            eventHandlers={{ mouseover: () => onFoco?.(e.cnpj), mouseout: () => onFoco?.(null) }}
          >
            <Popup>
              <CardEmpresa e={e} />
            </Popup>
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

function CardEmpresa({ e }: { e: EmpresaNoMapa }) {
  return (
    <div className="min-w-48 font-display">
      <p className="text-sm font-medium leading-tight text-night">{e.name}</p>
      <p className="mt-0.5 text-xs text-night/60">{e.local}</p>
      <p className="mt-2 text-lg font-light tracking-[-0.03em] text-night">{formatMoney(e.capital)}</p>
      <a href={`/empresas/${e.cnpj}`} className="mt-1 inline-block text-xs font-medium text-night underline underline-offset-4">
        Abrir empresa →
      </a>
    </div>
  );
}
