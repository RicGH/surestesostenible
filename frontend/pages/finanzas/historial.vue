<template>
  <div class="space-y-6">
    <p class="text-sm text-ink-500">{{ facturas.length }} pago(s) realizado(s)</p>
    <div class="card overflow-hidden">
      <table class="table">
        <thead>
          <tr><th>Folio</th><th>Proveedor</th><th>Monto</th><th>Fecha</th></tr>
        </thead>
        <tbody>
          <tr v-for="f in facturas" :key="f.id">
            <td class="font-mono text-xs">{{ f.folio }}</td>
            <td class="font-medium text-ink-800">{{ f.razon_social }}</td>
            <td class="font-medium">${{ Number(f.monto).toFixed(2) }} {{ f.moneda }}</td>
            <td>{{ f.fecha_emision }}</td>
          </tr>
          <tr v-if="!facturas.length"><td colspan="4" class="py-12 text-center text-ink-400">Sin pagos</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
const api = useApi();
const facturas = ref([]);
onMounted(async () => {
  const r = await api.get('/facturas/admin?estado=pagada');
  facturas.value = r.data;
});
</script>
