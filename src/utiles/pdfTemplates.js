export const plantillaBase = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Arial', sans-serif; padding: 30px; color: #333; }
        .header { border-bottom: 2px solid #2196F3; margin-bottom: 20px; }
        .title { color: #1a237e; font-size: 24px; font-weight: bold; }
        .summary-box { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .content { text-align: justify; }
        /* Estilos para lo que genere la AI */
        h2 { color: #1976d2; font-size: 18px; margin-top: 20px; }
        ul { margin-bottom: 15px; }
        .content {
        display: block !important;
        visibility: visible !important;
        min-height: 100px;
    }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">INFORME ACADÉMICO - RESULTADO ACTIVIDADES</div>
        <p>Referencia: {{FILTRO_PROPUESTA}} - {{FILTRO_PERIODO}}</p>
    </div>
    
    <div class="summary-box">
        <strong>Métricas Generales:</strong><br/>
        Promoción: {{AVG_PROMOCION}} | Regularidad: {{AVG_REGULAR}} | Índice E2: {{AVG_E2}}
    </div>

    <div class="content">
        {{CONTENIDO_AI}}
    </div>
</body>
</html>
`;