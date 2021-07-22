import { useEffect } from 'react';
import { createContext, ReactNode, useContext, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  // para não precisar dar o setItem no localStorage em todas as funções
  // useRef: acessa o estado anterior
  const prevCartRef = useRef<Product[]>();

  // roda todas as vezes que renderizar
  useEffect(()=> {
    // ref vai receber valor do carrinho
    prevCartRef.current = cart;
  });

  // como não podemos ficar observando uma referencia criamos isso:
  // cartPreviousValue recebe prevCart.current se ele existir, se não existir vai receber cart
  // na primeira passagem vai receber cart, a partir dai ele recebe o prevCartRef.current
  const cartPreviousValue = prevCartRef.current ?? cart;

  // esse useEffect vai fazer a comparação, ele vai atualizar no localStorage somente o estado atual for diferente do estato anterior
  useEffect(() => {
    if(cartPreviousValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      //updateCart é um novo array com valores de cart
      const updateCart = [...cart];
      // verifica se no updateCart contém o produto do id recebido nos parâmetros
      const productExists = updateCart.find(product => product.id === productId);
      // stock vai buscar no estoque o produto daquele id
      const stock = await api.get(`/stock/${productId}`);
      //stockAmount busca a quantidade do produto buscado
      const stockAmount = stock.data.amount;
      // quantidade atual
      const currentAmount = productExists ? productExists.amount : 0;
      // quantidade desejada
      const amount = currentAmount + 1;

      // verifica se a quantidade que o usuário quer está disponível
      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      // se o produto existit somente vai atualizar a quantidade adicionando mais um
      if(productExists){
        productExists.amount = amount;
      
        //caso não tenha vai adicionar o produto com amount = 1
      }else{
        const product = await api.get(`/products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1
        }
        // pode-se usar o push pois não está alterando direto o cart
        updateCart.push(newProduct);
      }

      setCart(updateCart);

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // ----solução original do desafio
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);
      if(productIndex >= 0){
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      }else{
        throw Error();
      }

      // ----minha solução para remover (não passa no teste em caso de não encontrar o produto para remover)
      // const updatedCart = cart.filter(product => product.id !== productId);
      // setCart(updatedCart);
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if(productExists){
        productExists.amount = amount;
        setCart(updatedCart);
      }else{
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
