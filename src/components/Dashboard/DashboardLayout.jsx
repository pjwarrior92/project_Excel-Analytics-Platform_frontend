import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function DashboardLayout() {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [uploadHistory, setUploadHistory] = useState([]);
  const chartRef = useRef();

  // ✅ Secure upload history fetch
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
    } else {
      axios.get('http://localhost:5000/api/files/history', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setUploadHistory(res.data))
      .catch(err => {
        console.error('History fetch error:', err);
        if (err.response?.status === 403 || err.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      });
    }
  }, []);
  

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async (e) => {
    e.preventDefault();
  
    if (!file) return alert('Please select a file first.');
  
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('xAxis', xAxis);
    formData.append('yAxis', yAxis);
    formData.append('chartType', chartType);
  
    try {
      const res = await axios.post('http://localhost:5000/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
  
      setParsedData(res.data.data);
      setXAxis('');
      setYAxis('');
      setChartType('bar');
  
      // ✅ Reload history from DB
      const historyRes = await axios.get('http://localhost:5000/api/files/history', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUploadHistory(historyRes.data);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Check server logs.');
    }
  };
  

  const handleDownload = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.href = url;
    link.download = 'excel-chart.png';
    link.click();
  };

  const handleDownloadPDF = async () => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.canvas;
    const image = await html2canvas(canvas);
    const pdf = new jsPDF();
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height / canvas.width) * width;
    pdf.addImage(image.toDataURL('image/png'), 'PNG', 10, 10, width - 20, height);
    pdf.save('excel-chart.pdf');
  };

  const handleDownloadExcel = () => {
    if (!parsedData.length) return;
    const worksheet = XLSX.utils.json_to_sheet(parsedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, 'excel-parsed-data.xlsx');
  };

  const getColorPalette = (count) => {
    const colors = [
      'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
      'rgba(100, 255, 218, 0.7)', 'rgba(200, 150, 255, 0.7)'
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  const columns = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];

  const ChartComponent = chartType === 'bar' ? Bar
    : chartType === 'line' ? Line
    : chartType === 'pie' ? Pie
    : null;

  const labels = parsedData.map(row => row[xAxis]);
  const values = parsedData.map(row => row[yAxis]);

  const chart = chartRef.current;
  const ctx = chart?.canvas?.getContext('2d');
  let gradient = null;
  if (ctx && chartType !== 'pie') {
    gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(255, 99, 132, 0.7)');
    gradient.addColorStop(1, 'rgba(54, 162, 235, 0.7)');
  }
  
  
  const chartData = {
    labels,
    datasets: [{
      label: `${yAxis} by ${xAxis}`,
      data: values,
      backgroundColor: chartType === 'pie'
        ? getColorPalette(parsedData.length)
        : gradient || 'rgba(54, 162, 235, 0.7)',
      borderColor: chartType === 'pie' ? '#fff' : 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        color: '#fff',
        font: { weight: 'bold', size: 16 },
        formatter: (value) => value
      },
      tooltip: {
        backgroundColor: '#222',
        titleColor: '#0ff',
        bodyColor: '#fff',
        borderColor: '#0ff',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => ` ${context.label || ''}: ${context.formattedValue}`
        }
      },
      legend: {
        labels: { color: '#333', font: { size: 14, weight: 'bold' } },
        position: 'bottom'
      }
    },
    scales: chartType === 'pie' ? {} : {
      x: { ticks: { color: '#444' }, grid: { color: '#eee' } },
      y: { ticks: { color: '#444' }, grid: { color: '#eee' } }
    }
  };

  return (
    <div className="container mt-5">
      <div className="text-end mb-3">
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
        >
          Logout
        </button>
      </div>

      <h1 className="text-center mb-4">📈 Excel Analytics Dashboard</h1>

      <form onSubmit={handleUpload} className="mb-4">
        <div className="mb-3">
          <input type="file" className="form-control" onChange={handleFileChange} accept=".xlsx,.xls" />
        </div>
        <button className="btn btn-primary">Upload Excel File</button>
      </form>

      {parsedData.length > 0 && (
        <>
          <div className="row mb-3">
            <div className="col-md-4">
              <label>X-Axis:</label>
              <select className="form-select" value={xAxis} onChange={e => setXAxis(e.target.value)}>
                <option value="">Select</option>
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label>Y-Axis:</label>
              <select className="form-select" value={yAxis} onChange={e => setYAxis(e.target.value)}>
                <option value="">Select</option>
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label>Chart Type:</label>
              <select className="form-select" value={chartType} onChange={e => setChartType(e.target.value)}>
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="pie">Pie</option>
              </select>
            </div>
          </div>

          {xAxis && yAxis && ChartComponent && (
            <>
              <div style={{ maxWidth: '600px', margin: 'auto' }}>
                <div className="card p-3 mb-3" style={{ height: '400px' }}>
                  <ChartComponent ref={chartRef} data={chartData} options={chartOptions} />
                </div>
              </div>
              <div className="text-center mb-4">
                
                <button className="btn btn-success me-2" onClick={handleDownload}>Download PNG</button>
                <button className="btn btn-danger me-2" onClick={handleDownloadPDF}>Download PDF</button>
                <button className="btn btn-secondary" onClick={handleDownloadExcel}>Download Excel</button>
              </div>
            </>
          )}

          <div>
            <h5>Parsed Data:</h5>
            <pre style={{ maxHeight: '300px', overflowY: 'scroll' }}>
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>
        </>
      )}

{uploadHistory.length > 0 && (
  <div className="mt-5">
    <div className="d-flex justify-content-between align-items-center mb-2">
      <h5 className="mb-0">📁 Upload History</h5>
      <button
        className="btn btn-outline-secondary btn-sm"
        onClick={async () => {
          const token = localStorage.getItem('token');
          try {
            const res = await axios.get('http://localhost:5000/api/files/history', {
              headers: { Authorization: `Bearer ${token}` }
            });
            setUploadHistory(res.data);
          } catch (err) {
            alert("⚠️ Failed to refresh history.");
            console.error("Refresh error:", err);
          }
        }}
      >
        🔄 Refresh History
      </button>
    </div>

    <ul className="list-group">
  {uploadHistory.map((item, index) => (
    <li
      key={item._id || index}
      className="list-group-item d-flex justify-content-between align-items-center"
    >
      <div>
        <strong>{item.originalFilename}</strong><br />
        <small>{new Date(item.createdAt).toLocaleString()}</small>
      </div>
      <div className="d-flex">
        <button
          className="btn btn-sm btn-primary me-2"
          onClick={() => {
            setParsedData(item.parsedData || []);
            setXAxis(item.xAxis || '');
            setYAxis(item.yAxis || '');
            setChartType(item.chartType || 'bar');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          Load
        </button>

        

        <button
          className="btn btn-sm btn-danger"
          onClick={async () => {
            const token = localStorage.getItem('token');
            if (window.confirm('Are you sure you want to delete this entry?')) {
              await axios.delete(`http://localhost:5000/api/files/history/${item._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setUploadHistory(prev => prev.filter(h => h._id !== item._id));
            }
          }}
        >
          🗑️ Delete
        </button>
      </div>
    </li>
  ))}
</ul>



  </div>
)}

    </div>
  );
}
